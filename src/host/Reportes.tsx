// pages/ReportesPage.tsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  DownloadOutlined,
  FileExcelOutlined,
  LoadingOutlined,
  HomeOutlined,
  BarChartOutlined,
  SearchOutlined,
  BuildOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  ApartmentOutlined,
  PrinterOutlined,
  CloseOutlined,
} from "@ant-design/icons";

import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import * as XLSX from "xlsx-js-style";

import type { ITableBordersOptions } from "docx";

// DOCX + saveAs
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header as DocxHeader,
  HeadingLevel,
  Packer,
  Paragraph,
  SectionType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  ImageRun,
  PageNumber,
  VerticalAlign,
  TableOfContents,
  
} from "docx";
import { saveAs } from "file-saver";

// PDF
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ===================== Tipos ===================== */
interface ExportStatus {
  exporting: boolean;
  error: string | null;
  progress?: number;
}
interface Empresa { id_empresa: number; nombre: string; }

interface SolicitanteRow {
  id_solicitante: number;
  nombre: string;
  email: string | null;
  empresa?: { nombre: string } | null;
  equipos?: unknown[];
}
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

  // ⬇️ añade esto
  tipo?: string | null;
}

/** Ticket base obtenido por /tickets */
interface TicketRow {
  ticket_id: string;
  solicitante_email: string | null;
  empresa: string | null;
  subject: string;
  type: string | null;
  /** Fecha de creación (ISO) */
  fecha: string;
}

/** Variantes opcionales que podrían venir del backend para tiempos reales */
interface TicketTimingExtras {
  created_at?: string;
  createdAt?: string;
  closed_at?: string;
  closedAt?: string;
  resolved_at?: string;
  resolvedAt?: string;
  /** Si el backend ya entrega la duración en minutos */
  minutosResolucion?: number;
}
type TicketLike = TicketRow & TicketTimingExtras;

interface ApiList<T> {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items?: T[];
  data?: T[];
}
interface TicketsResp {
  page: number;
  pageSize: number;
  total: number;
  rows: TicketRow[];
  totalPages?: number;
}
interface ReporteGeneralData {
  solicitantes: SolicitanteRow[];
  equipos: EquipoRow[];
  visitas: VisitaRow[];
  tickets: TicketRow[];
  empresaFiltro?: string;
}

/* ===================== Config ===================== */
const API_URL =
  (import.meta as ImportMeta).env.VITE_API_URL || "http://localhost:4000/api";

/* ===================== Texto fijo ===================== */
const TEXTO_FIJO = {
  subtitulo: "Asesorías RIDS — Reporte operativo",
  paraDefault: "Organización",
  de: "Rudy Calsin, Manuel Ahumada, Asesorías RIDS Ltda.",
  asunto: "Informe de actividades del periodo",
  fecha: new Date().toLocaleDateString("es-CL"),
  ingeniera: "Constanza Arenas",
  tecnicos: "Manuel Ahumada, Rudy Calsin",
  intro:
    "Este documento compila el trabajo de soporte técnico informático ejecutado por Asesorías RIDS Ltda., orientado al mantenimiento y a la gestión operativa de la infraestructura y del equipamiento de usuarios.",
  antecedentes:
    "El presente informe resume solicitudes, tickets y actividades del periodo indicado.",
  objetivos:
    "Prestar soporte informático externo, asegurando continuidad operacional y cumplimiento de SLA.",
  metodos: [
    "Atención de incidencias vía HelpDesk (soporte@rids.cl).",
    "Mantenimientos preventivos a equipos de usuarios (laptops y desktops).",
    "Emisión de informes mensuales con solicitudes e incidencias gestionadas.",
  ],
  resultados: [
    "Todas las incidencias registradas en el periodo fueron gestionadas en el HelpDesk.",
    "Se detalla más abajo la distribución por categoría y tiempos de resolución estimados.",
  ],
  tipologiasComentario:
    "El gráfico resume las categorías de atención recibidas y su distribución por niveles de SLA.",
  correo: "soporte@rids.cl",
  folio: "Folio: —",
};

/* ===================== Helpers ===================== */
const tokenHeader = (): HeadersInit => {
  const token = localStorage.getItem("accessToken");
  const h: Record<string, string> = {};
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};

/** ===== SLA resolución real (SOLO tickets cerrados) ===== */
type SlaRow = { label: string; count: number; percent: string };

const getCreatedAt = (t: TicketLike): string | null =>
  t.created_at ?? t.createdAt ?? t.fecha ?? null;
const getClosedAt = (t: TicketLike): string | null =>
  t.closed_at ?? t.closedAt ?? t.resolved_at ?? t.resolvedAt ?? null;

const getTicketResolutionMinutes = (t: TicketLike): number | null => {
  if (typeof t.minutosResolucion === "number") return t.minutosResolucion;
  const createdStr = getCreatedAt(t);
  const closedStr = getClosedAt(t);
  if (!createdStr || !closedStr) return null;
  const created = new Date(createdStr).getTime();
  const closed = new Date(closedStr).getTime();
  if (Number.isNaN(created) || Number.isNaN(closed) || closed < created) return null;
  return Math.round((closed - created) / 60000);
};

const buildSlaResolutionFromTickets = (tickets: TicketLike[]): SlaRow[] => {
  const buckets = [
    { label: "Menos de 1 hora", test: (m: number) => m < 60 },
    { label: "Entre 1 y 2 horas", test: (m: number) => m >= 60 && m < 120 },
    { label: "Entre 2 y 5 horas", test: (m: number) => m >= 120 && m < 300 },
    { label: "Entre 5 y 10 horas", test: (m: number) => m >= 300 && m < 600 },
    { label: "Entre 10 y 24 horas", test: (m: number) => m >= 600 && m < 1440 },
    { label: "Entre 24 y 48 horas", test: (m: number) => m >= 1440 && m < 2880 },
    { label: "Entre 48 y 96 horas", test: (m: number) => m >= 2880 && m < 5760 },
    { label: "Más de 96 horas", test: (m: number) => m >= 5760 },
  ];
  const counts = buckets.map(() => 0);
  let closedCount = 0;
  for (const tk of tickets as TicketLike[]) {
    const mins = getTicketResolutionMinutes(tk);
    if (mins == null) continue;
    closedCount++;
    const idx = buckets.findIndex((b) => b.test(mins));
    if (idx >= 0) counts[idx] += 1;
  }
  const denom = closedCount || 1;
  return buckets.map((b, i) => ({
    label: b.label,
    count: counts[i],
    percent: `${Math.round((counts[i] * 100) / denom)}%`,
  }));
};

/* ======= Helpers para preview/tablas ======= */
const asBool = (v: unknown) => v === true || v === 1 || v === "1";

const contarMantenimientos = (visitas: VisitaRow[]) => {
  let rendimientoEquipo = 0, ccleaner = 0, actualizaciones = 0, licenciaOffice = 0,
      antivirus = 0, licenciaWindows = 0, estadoDisco = 0, mantenimientoReloj = 0;

  for (const v of visitas) {
    if (asBool(v.rendimientoEquipo)) rendimientoEquipo++;
    if (asBool(v.ccleaner)) ccleaner++;
    if (asBool(v.actualizaciones)) actualizaciones++;
    if (asBool(v.licenciaOffice)) licenciaOffice++;
    if (asBool(v.antivirus)) antivirus++;
    if (asBool(v.licenciaWindows)) licenciaWindows++;
    if (asBool(v.estadoDisco)) estadoDisco++;
    if (asBool(v.mantenimientoReloj)) mantenimientoReloj++;
  }

  return [
    { Ítem: "Rendimiento del equipo", Cantidad: rendimientoEquipo },
    { Ítem: "CCleaner", Cantidad: ccleaner },
    { Ítem: "Actualizaciones", Cantidad: actualizaciones },
    { Ítem: "Licencia office", Cantidad: licenciaOffice },
    { Ítem: "Antivirus", Cantidad: antivirus },
    { Ítem: "Licencia Windows", Cantidad: licenciaWindows },
    { Ítem: "Estado del disco", Cantidad: estadoDisco },
    { Ítem: "Mantenimiento del reloj", Cantidad: mantenimientoReloj },
  ];
};

const contarTiposVisita = (visitas: VisitaRow[]) => {
  let programada = 0;
  let adicional = 0;

  for (const v of visitas) {
    const tipoBase = v.tipo?.trim() ?? "";
    const status = v.status?.toLowerCase() ?? "";

    const tipo = tipoBase.length > 0
      ? tipoBase
      : (status.includes("program") ? "Solicitud Programada" : "Solicitudes adicionales");

    if (tipo.toLowerCase().includes("program")) {
      programada++;
    } else {
      adicional++;
    }
  }

  return [
    { Tipo: "Solicitudes adicionales", Cantidad: adicional },
    { Tipo: "Solicitud Programada", Cantidad: programada },
  ];
};


const contarExtras = (visitas: VisitaRow[]) => {
  let impresoras = 0, telefonos = 0, pie = 0, otros = 0;
  const detMap = new Map<string, number>();

  for (const v of visitas) {
    if (asBool(v.confImpresoras)) impresoras++;
    if (asBool(v.confTelefonos)) telefonos++;
    if (asBool(v.confPiePagina)) pie++;
    if (asBool(v.otros)) {
      otros++;
      const det = (v.otrosDetalle ?? "—").trim() || "—";
      detMap.set(det, (detMap.get(det) || 0) + 1);
    }
  }

  const detalles = Array.from(detMap.entries()).map(([Detalle, Cantidad]) => ({ Detalle, Cantidad }));
  return {
    totales: [
      { Ítem: "Impresoras", Cantidad: impresoras },
      { Ítem: "Teléfonos", Cantidad: telefonos },
      { Ítem: "Pie de página", Cantidad: pie },
      { Ítem: "Otros", Cantidad: otros },
    ],
    detalles,
  };
};

/* ===================== Componente ===================== */
const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const ReportesPage: React.FC = () => {
  const navigate = useNavigate();

  const [exportStatus, setExportStatus] = useState<ExportStatus>({ exporting: false, error: null });
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaFiltro, setEmpresaFiltro] = useState<string>("");

  // Año y mes
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const [searchTerm, setSearchTerm] = useState<string>("");

  // Portada editable
  const [docxTitulo, setDocxTitulo] = useState<string>("Informe Operativo");
  const [docxSubtitulo, setDocxSubtitulo] = useState<string>(TEXTO_FIJO.subtitulo);
  const [observaciones, setObservaciones] = useState<string>("");

  // Contenedor oculto para PDF
  const previewRef = useRef<HTMLDivElement>(null);
  const [dataPrev, setDataPrev] = useState<ReporteGeneralData | null>(null);

  // Modal PDF inline
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const closePdfModal = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setPdfModalOpen(false);
  };

  const printPdf = () => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  const downloadPdf = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `Reporte_${new Date().toISOString().slice(0,10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /* ===== Empresas ===== */
  useEffect(() => {
    const cargarEmpresas = async () => {
      try {
        const url = new URL(`${API_URL}/empresas`);
        url.searchParams.set("pageSize", "1000");
        const r = await fetch(url.toString(), { headers: tokenHeader() });
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

  /* ===== Utilidades XLSX ===== */
  const applyBasicStyles = (worksheet: XLSX.WorkSheet): XLSX.WorkSheet => {
    const ref = worksheet["!ref"];
    if (!ref) return worksheet;

    const headerStyle: XLSX.CellStyle = {
      font: { bold: true, color: { rgb: "FFFFFFFF" } },
      fill: { fgColor: { rgb: "FF1F2937" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { rgb: "FFE5E7EB" } },
        left: { style: "thin", color: { rgb: "FFE5E7EB" } },
        right: { style: "thin", color: { rgb: "FFE5E7EB" } },
      },
    };

    const cellBorder: XLSX.CellStyle["border"] = {
      top: { style: "thin", color: { rgb: "FFE5E7EB" } },
      bottom: { style: "thin", color: { rgb: "FFE5E7EB" } },
      left: { style: "thin", color: { rgb: "FFE5E7EB" } },
      right: { style: "thin", color: { rgb: "FFE5E7EB" } },
    };

    const range = XLSX.utils.decode_range(ref);
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      const cell = worksheet[addr] as XLSX.CellObject | undefined;
      if (cell) cell.s = { ...(cell.s || {}), ...headerStyle };
    }
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

  /* ===== Fetchers ===== */
  const fetchSolicitantes = async (empresaId: string): Promise<SolicitanteRow[]> => {
    const first = new URL(`${API_URL}/solicitantes`);
    first.searchParams.set("page", "1");
    first.searchParams.set("pageSize", "100");
    first.searchParams.set("empresaId", empresaId);
    const r1 = await fetch(first, { headers: tokenHeader() });
    if (!r1.ok) throw new Error("HTTP " + r1.status);
    const j1 = (await r1.json()) as ApiList<SolicitanteRow>;
    const totalPages = j1.totalPages ?? 1;
    const all: SolicitanteRow[] = [...(j1.items ?? j1.data ?? [])];
    for (let p = 2; p <= totalPages; p++) {
      const u = new URL(`${API_URL}/solicitantes`);
      u.searchParams.set("page", String(p));
      u.searchParams.set("pageSize", "100");
      u.searchParams.set("empresaId", empresaId);
      const r = await fetch(u, { headers: tokenHeader() });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = (await r.json()) as ApiList<SolicitanteRow>;
      all.push(...(j.items ?? j.data ?? []));
    }
    return all;
  };

  const fetchEquipos = async (empresaId: string): Promise<EquipoRow[]> => {
    const first = new URL(`${API_URL}/equipos`);
    first.searchParams.set("page", "1");
    first.searchParams.set("pageSize", "200");
    first.searchParams.set("empresaId", empresaId);

    const r1 = await fetch(first, { headers: tokenHeader() });
    if (!r1.ok) throw new Error("HTTP " + r1.status);
    const j1 = (await r1.json()) as ApiList<EquipoRow>;
    const totalPages = j1.totalPages ?? 1;

    const all: EquipoRow[] = [...(j1.items ?? j1.data ?? [])];
    for (let p = 2; p <= totalPages; p++) {
      const u = new URL(`${API_URL}/equipos`);
      u.searchParams.set("page", String(p));
      u.searchParams.set("pageSize", "200");
      u.searchParams.set("empresaId", empresaId);
      const r = await fetch(u, { headers: tokenHeader() });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = (await r.json()) as ApiList<EquipoRow>;
      all.push(...(j.items ?? j.data ?? []));
    }
    return all;
  };

  const fetchVisitas = async (empresaId: string): Promise<VisitaRow[]> => {
    const first = new URL(`${API_URL}/visitas`);
    first.searchParams.set("page", "1");
    first.searchParams.set("pageSize", "100");
    first.searchParams.set("empresaId", empresaId);
    const r1 = await fetch(first, { headers: tokenHeader() });
    if (!r1.ok) throw new Error("HTTP " + r1.status);
    const j1 = (await r1.json()) as ApiList<VisitaRow>;
    const totalPages = j1.totalPages ?? 1;
    const all: VisitaRow[] = [...(j1.items ?? j1.data ?? [])];

    for (let p = 2; p <= totalPages; p++) {
      const u = new URL(`${API_URL}/visitas`);
      u.searchParams.set("page", String(p));
      u.searchParams.set("pageSize", "100");
      u.searchParams.set("empresaId", empresaId);
      const r = await fetch(u, { headers: tokenHeader() });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = (await r.json()) as ApiList<VisitaRow>;
      all.push(...(j.items ?? j.data ?? []));
    }
    return all;
  };

  const fetchTickets = async (empresaId: string): Promise<TicketRow[]> => {
    const first = new URL(`${API_URL}/tickets`);
    first.searchParams.set("page", "1");
    first.searchParams.set("pageSize", "200");
    const emp = empresas.find((e) => e.id_empresa === Number(empresaId));
    if (emp) first.searchParams.set("empresa", emp.nombre);

    const r1 = await fetch(first, { headers: tokenHeader() });
    if (!r1.ok) throw new Error("HTTP " + r1.status);
    const j1 = (await r1.json()) as TicketsResp;
    const pages = j1.totalPages ?? Math.max(1, Math.ceil(j1.total / j1.pageSize));
    const all: TicketRow[] = [...(j1.rows ?? [])];

    for (let p = 2; p <= pages; p++) {
      const u = new URL(`${API_URL}/tickets`);
      u.searchParams.set("page", String(p));
      u.searchParams.set("pageSize", "200");
      if (emp) u.searchParams.set("empresa", emp.nombre);
      const r = await fetch(u, { headers: tokenHeader() });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = (await r.json()) as TicketsResp;
      all.push(...(j.rows ?? []));
    }
    return all;
  };


  /* ===== Filtros de fecha en cliente ===== */
  const isSameYearMonth = (iso: string | null | undefined, y: number, m01: number) => {
    if (!iso) return false;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    return d.getFullYear() === y && d.getMonth() + 1 === m01;
  };

  /* ===== Orquestador ===== */
  const obtenerDatosReporteGeneral = async (): Promise<ReporteGeneralData> => {
    if (!empresaFiltro || !selectedYear || !selectedMonth) {
      return { solicitantes: [], equipos: [], visitas: [], tickets: [] };
    }
    const [solicitantes, equipos, visitas, tickets] = await Promise.all([
      fetchSolicitantes(empresaFiltro),
      fetchEquipos(empresaFiltro),
      fetchVisitas(empresaFiltro),
      fetchTickets(empresaFiltro),
    ]);

    const y = Number(selectedYear);
    const m = Number(selectedMonth); // 1..12

    // Filtra por periodo
    const visitasFiltradas = visitas.filter((v) => isSameYearMonth(v.inicio ?? null, y, m));
    const ticketsFiltrados = tickets.filter((t) => isSameYearMonth(getCreatedAt(t) ?? t.fecha, y, m));

    return {
      solicitantes,
      equipos,
      visitas: visitasFiltradas,
      tickets: ticketsFiltrados,
      empresaFiltro,
    };
  };

  /* ===== Mapeos ===== */
  const mapSolicitante = (s: SolicitanteRow) => ({
    ID: s.id_solicitante,
    Nombre: s.nombre ?? "",
    Email: s.email ?? "No disponible",
    Empresa: s.empresa?.nombre ?? "",
    "Cantidad de Equipos": Array.isArray(s.equipos) ? s.equipos.length : 0,
  });


  const mapVisita = (v: VisitaRow) => ({
    Técnico: v.tecnico?.nombre ?? "—",
    "Fecha de Visita": v.inicio ? new Date(v.inicio).toLocaleDateString("es-CL") : "",
    Horario:
      v.inicio && v.fin
        ? `${new Date(v.inicio).toLocaleTimeString("es-CL")} - ${new Date(v.fin).toLocaleTimeString("es-CL")}`
        : "—",
    Usuario: v.solicitante ?? v.solicitanteRef?.nombre ?? "",
    Estado: (v.status ?? "").toUpperCase() || "—",
  });

  const mapTicket = (t: TicketRow) => ({
    ID: t.ticket_id,
    Asunto: t.subject ?? "",
    Estado: "Cerrado",
    Categoría: t.type ?? "—",
    Fecha: t.fecha ? new Date(t.fecha).toLocaleString("es-CL") : "",
  });

  /* =================== DOCX: Estilo Ejecutivo =================== */
  const THEME = {
    primary: "1F2937",
    primaryLight: "F3F4F6",
    text: "0F172A",
    textMuted: "475569",
    border: "E5E7EB",
    zebra: "F9FAFB",
    accent: "2563EB",
  };

  const H1 = (t: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 260, after: 140, line: 360 },
      children: [new TextRun({ text: t, bold: true })],
    });

  const H2 = (t: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100, line: 340 },
      children: [new TextRun({ text: t, bold: true })],
    });

  const Body = (t: string) =>
    new Paragraph({
      spacing: { after: 140, line: 320 },
      children: [new TextRun({ text: t, color: THEME.text })],
    });

  const Note = (t: string) =>
    new Paragraph({
      spacing: { before: 40, after: 160 },
      children: [new TextRun({ text: t, italics: true, color: THEME.textMuted })],
    });

  const Divider = () =>
    new Paragraph({
      border: {
        bottom: {
          style: BorderStyle.SINGLE, // requerido
          size: 6,                   // grosor (en 1/8 pt)
          color: THEME.border,       // opcional pero útil
        },
      },
      spacing: { after: 220 },
    });

  const noBorders: ITableBordersOptions = {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };


  const tablePro = (
    caption: string,
    headers: string[],
    rows: Array<Record<string, string | number>>
  ): Table[] => {
    const chunk = <T,>(arr: T[], size = 28): T[][] => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };

    const groups = chunk(rows, 28);
    const tables: Table[] = [];

    for (const group of groups) {
      const headerCells = headers.map(
        (h) =>
          new TableCell({
            shading: { fill: THEME.primary },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [new TextRun({ text: h, bold: true, color: "FFFFFF" })],
              }),
            ],
          })
      );

      const bodyRows = group.map((r, idx) => {
        const bg = idx % 2 === 0 ? THEME.zebra : "FFFFFF";
        return new TableRow({
          children: headers.map(
            (k) =>
              new TableCell({
                shading: { fill: bg },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: String(r[k] ?? ""), color: THEME.text })],
                  }),
                ],
              })
          ),
        });
      });

      tables.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({ children: headerCells }), ...bodyRows],
        })
      );
    }

    // Caption discreto
    tables.unshift(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: noBorders,
                children: [
                  new Paragraph({
                    spacing: { before: 80, after: 140 },
                    children: [
                      new TextRun({
                        text: caption,
                        italics: true,
                        color: THEME.textMuted,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    return tables;
  };

  /** Logo desde public/login/LOGO_RIDS.png */
  const fetchLogoBytes = async (): Promise<Uint8Array | null> => {
    try {
      const res = await fetch("/login/LOGO_RIDS.png", { cache: "no-store" });
      if (!res.ok) return null;
      const arrayBuf = await res.arrayBuffer();
      return new Uint8Array(arrayBuf);
    } catch {
      return null;
    }
  };

  /** Portada */
  const portada = (
    logoBytes: Uint8Array | null,
    titulo: string,
    subtitulo: string,
    empresa: string,
    periodo: string
  ) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: noBorders, // TableCellBorders
              width: { size: 65, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { after: 160 },
                  children: [
                    logoBytes
                      ? new ImageRun({
                          data: logoBytes,
                          type: "png",
                          transformation: { width: 200, height: 60 },
                        })
                      : new TextRun({ text: "Asesorías RIDS Ltda.", bold: true, size: 36 }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 60 },
                  children: [
                    new TextRun({
                      text: titulo,
                      bold: true,
                      size: 58,
                      color: THEME.primary,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 80 },
                  children: [
                    new TextRun({
                      text: subtitulo,
                      size: 28,
                      color: THEME.textMuted,
                    }),
                  ],
                }),
                new Paragraph({
                  border: {
                    bottom: {
                      style: BorderStyle.SINGLE,   // ✅ requerido por docx
                      size: 6,
                      color: THEME.border,
                    },
                  },
                  spacing: { before: 40, after: 120 },
                  children: [
                    new TextRun({
                      text: `${empresa} · ${periodo}`,
                      size: 26,
                      color: THEME.text,
                    }),
                  ],
                }),
              ],
            }),

            new TableCell({
              borders: noBorders,
              width: { size: 35, type: WidthType.PERCENTAGE },
              shading: { fill: THEME.primaryLight },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: 90, after: 0 },
                  children: [new TextRun({ text: TEXTO_FIJO.folio, color: THEME.accent, bold: true })],
                }),
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [new TextRun({ text: TEXTO_FIJO.correo, color: THEME.textMuted })],
                }),
              ],
            }),
          ],
        }),
      ],
    });

  const buildHeader = (empresa: string) =>
    new DocxHeader({
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [new TextRun({ text: `Informe Operativo · ${empresa}`, color: THEME.textMuted })],
        }),
      ],
    });

  const buildFooter = () =>
    new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Página " }),
            new TextRun({ children: [PageNumber.CURRENT] }),
            new TextRun({ text: " de " }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
            new TextRun({ text: "  ·  soporte@rids.cl" }),
          ],
        }),
      ],
    });

  /* =============== Export DOCX =============== */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const MONTHS_NAMES = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
  ];
  const periodoTexto = useMemo(() => {
    if (!selectedYear || !selectedMonth) return "";
    return `${MONTHS_NAMES[Number(selectedMonth) - 1]} ${selectedYear}`;
  }, [selectedYear, selectedMonth, MONTHS_NAMES]);

  const exportDOCX = async () => {
    try {
      setExportStatus({ exporting: true, error: null });
      const data = await obtenerDatosReporteGeneral();

      const empresaNombre =
        empresas.find((e) => e.id_empresa === Number(empresaFiltro))?.nombre ||
        TEXTO_FIJO.paraDefault;

      const sMap = new Map<number, string>();
      for (const s of data.solicitantes) if (typeof s.id_solicitante === "number") sMap.set(s.id_solicitante, s.nombre ?? "");

      const ticketsRows = data.tickets.map((t) => ({
        ID: t.ticket_id,
        Asunto: t.subject ?? "",
        Estado: "Cerrado",
        Categoría: t.type ?? "—",
        Fecha: t.fecha ? new Date(t.fecha).toLocaleString("es-CL") : "",
      }));

      const visitasRows = data.visitas.map((v) => ({
        "Técnico": v.tecnico?.nombre ?? "—",
        "Fecha de Visita": v.inicio ? new Date(v.inicio).toLocaleDateString("es-CL") : "",
        "Horario":
          v.inicio && v.fin
            ? `${new Date(v.inicio).toLocaleTimeString("es-CL")} - ${new Date(v.fin).toLocaleTimeString("es-CL")}`
            : "—",
        "Usuario": v.solicitante ?? v.solicitanteRef?.nombre ?? "",
        "Estado": (v.status ?? "").toUpperCase() || "—",
      }));

      const correosRows = data.solicitantes.map((s, i) => ({
        "#": i + 1,
        "Nombre": s.nombre ?? "",
        "Correo": s.email ?? "",
      }));

      const inventarioRows = data.equipos.map((e) => ({
        Serial: e.serial ?? "",
        Marca: e.marca ?? "",
        Modelo: e.modelo ?? "",
        RAM: e.ram ?? "",
        Disco: e.disco ?? "",
        Propiedad: e.propiedad ?? "",
        Solicitante: e.idSolicitante != null ? (sMap.get(e.idSolicitante) ?? "") : "",
      }));

      const slaRowsForDocx = buildSlaResolutionFromTickets(
        data.tickets as TicketLike[]
      ).map((r) => ({
        "Rango": r.label,
        "Tickets": String(r.count),
        "Porcentaje": r.percent,
      }));

      const extras = contarExtras(data.visitas);

      const logoBytes = await fetchLogoBytes();

      const kpis = [
        { label: "Tickets del periodo", value: data.tickets.length },
        { label: "Visitas técnicas", value: data.visitas.length },
        { label: "Equipos registrados", value: data.equipos.length },
        { label: "Usuarios atendidos", value: data.solicitantes.length },
      ];

      const doc = new Document({
        styles: {
          default: {
            document: {
              run: { font: "Calibri", size: 22, color: THEME.text },
            },
          },
          paragraphStyles: [
            {
              id: "Normal",
              name: "Normal",
              basedOn: "Normal",
              next: "Normal",
              quickFormat: true,
              paragraph: {
                spacing: { after: 120 }, // <- tu espaciado global para párrafos
              },
            },
          ],
        },
        sections: [
          {
            properties: {
              page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
              type: SectionType.CONTINUOUS,
            },
            headers: { default: buildHeader(empresaNombre) },
            footers: { default: buildFooter() },
            children: [
              portada(logoBytes, docxTitulo, docxSubtitulo, empresaNombre, periodoTexto || TEXTO_FIJO.fecha),
              Divider(),

              H1("Contenido"),
              new TableOfContents("Tabla de contenidos", {
                hyperlink: true,
                headingStyleRange: "1-3",
              }),
              H1("Resumen Ejecutivo"),
              Body("Durante el periodo indicado se gestionaron las incidencias y solicitudes de soporte conforme a los acuerdos de nivel de servicio (SLA). A continuación, se presenta un resumen con los principales indicadores del mes."),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: kpis.map(
                      (k) =>
                        new TableCell({
                          shading: { fill: THEME.primaryLight },
                          children: [
                            new Paragraph({
                              children: [new TextRun({ text: String(k.value), bold: true, size: 36, color: THEME.primary })],
                            }),
                            new Paragraph({
                              children: [new TextRun({ text: k.label, size: 20, color: THEME.textMuted })],
                            }),
                          ],
                        })
                    ),
                  }),
                ],
              }),
              Note("Los KPIs consideran únicamente el periodo seleccionado (empresa, año y mes)."),

              H1("Contexto y Alcance"),
              H2("Antecedentes"),
              Body(TEXTO_FIJO.antecedentes),
              H2("Objetivos"),
              Body(TEXTO_FIJO.objetivos),
              H2("Métodos"),
              ...TEXTO_FIJO.metodos.map((m) => Body("• " + m)),
              H2("Resultados"),
              ...TEXTO_FIJO.resultados.map((m) => Body("• " + m)),

              H1("Desempeño de SLA"),
              Body("Distribución de tiempos de resolución para tickets cerrados en el periodo:"),
              ...tablePro("Distribución de tiempos de resolución (SLA).", ["Rango", "Tickets", "Porcentaje"], slaRowsForDocx),

              H1("Detalle de Gestión"),
              H2("Tickets"),
              ...tablePro("Detalle de tickets del periodo.", ["ID", "Asunto", "Estado", "Categoría", "Fecha"], ticketsRows),

              H2("Visitas Técnicas"),
              ...tablePro("Visitas técnicas realizadas.", ["Técnico", "Fecha de Visita", "Horario", "Usuario", "Estado"], visitasRows),

              H2("Configuraciones y Otros (totales)"),
              ...tablePro("Totales de Impresoras, Teléfonos, Pie de página y Otros.", ["Ítem", "Cantidad"], extras.totales.map(r => ({ "Ítem": r.Ítem, "Cantidad": String(r.Cantidad) }))),

              H2("Detalle de “Otros”"),
              ...tablePro("Detalles reportados en 'Otros'.", ["Detalle otros", "Cantidad"], (extras.detalles.length ? extras.detalles : [{ Detalle: "—", Cantidad: 0 }]).map(d => ({ "Detalle otros": d.Detalle, "Cantidad": String(d.Cantidad) }))),

              H2("Usuarios y Correos activos"),
              ...tablePro("Listado de correos activos.", ["#", "Nombre", "Correo"], correosRows),

              H2("Inventario de Equipamiento"),
              ...tablePro("Inventario asociado (con solicitante).", ["Serial", "Marca", "Modelo", "RAM", "Disco", "Propiedad", "Solicitante"], inventarioRows),

              H1("Observaciones y Recomendaciones"),
              Body(observaciones || "Sin observaciones adicionales para el periodo."),
              Divider(),

              H1("Firmas"),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({ children: [new TextRun({ text: "______________________________", color: THEME.text })] }),
                          new Paragraph({ children: [new TextRun({ text: "Asesorías RIDS Ltda.", bold: true })] }),
                          new Paragraph({ children: [new TextRun({ text: "Representante", color: THEME.textMuted })] }),
                        ],
                      }),
                      new TableCell({
                        children: [
                          new Paragraph({ children: [new TextRun({ text: (empresas.find(e=>e.id_empresa===Number(empresaFiltro))?.nombre || TEXTO_FIJO.paraDefault), bold: true })] }),
                          new Paragraph({ children: [new TextRun({ text: "Representante Cliente", color: THEME.textMuted })] }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const safeEmpresa = (empresas.find((e) => e.id_empresa === Number(empresaFiltro))?.nombre || TEXTO_FIJO.paraDefault)
        .replace(/\s+/g, "_").replace(/[^\w]/g, "");
      const safePeriodo = selectedYear && selectedMonth ? `${selectedYear}-${String(selectedMonth).padStart(2,"0")}` : "Periodo";
      saveAs(blob, `Informe_${safeEmpresa}_${safePeriodo}_${ts}.docx`);

      setExportStatus({ exporting: false, error: null });
    } catch (e) {
      console.error(e);
      setExportStatus({ exporting: false, error: "No se pudo generar el Word (DOCX)." });
    }
  };

  /* ===== Export XLSX ===== */
  const crearHojaConDatos = <T,>(
    wb: XLSX.WorkBook,
    datos: T[],
    nombreHoja: string,
    mapper: (row: T) => Record<string, string | number>
  ) => {
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
  };

  const exportReporteGeneral = async () => {
    try {
      setExportStatus({ exporting: true, error: null });
      setGlobalError(null);

      const data = await obtenerDatosReporteGeneral();
      const wb = XLSX.utils.book_new();

      const empresaNombre =
        empresas.find((e) => e.id_empresa === Number(empresaFiltro))?.nombre || "Empresa";

      const resumenData = [
        { Métrica: "Empresa", Valor: empresaNombre },
        { Métrica: "Periodo", Valor: periodoTexto || "-" },
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

      crearHojaConDatos(wb, data.solicitantes, "Solicitantes", mapSolicitante);

      const sMap = new Map<number, string>();
      for (const s of data.solicitantes) if (typeof s.id_solicitante === "number") sMap.set(s.id_solicitante, s.nombre ?? "");

      const equiposRowsXlsx = data.equipos.map((e) => ({
        Serial: e.serial ?? "",
        Marca: e.marca ?? "",
        Modelo: e.modelo ?? "",
        RAM: e.ram ?? "",
        Disco: e.disco ?? "",
        Propiedad: e.propiedad ?? "",
        Solicitante: e.idSolicitante != null ? (sMap.get(e.idSolicitante) ?? "") : "",
      }));
      const wsEquipos = XLSX.utils.json_to_sheet(equiposRowsXlsx);
      applyBasicStyles(wsEquipos);
      XLSX.utils.book_append_sheet(wb, wsEquipos, "Equipos");

      crearHojaConDatos(wb, data.visitas, "Visitas Técnicas", mapVisita);
      crearHojaConDatos(wb, data.tickets, "Tickets", mapTicket);

      const wsTipos = XLSX.utils.json_to_sheet(contarTiposVisita(data.visitas));
      applyBasicStyles(wsTipos);
      XLSX.utils.book_append_sheet(wb, wsTipos, "Tipos de solicitud");

      const extras = contarExtras(data.visitas);
      const wsExtrasTot = XLSX.utils.json_to_sheet(extras.totales);
      applyBasicStyles(wsExtrasTot);
      XLSX.utils.book_append_sheet(wb, wsExtrasTot, "Extras - Totales");

      const wsExtrasDet = XLSX.utils.json_to_sheet(extras.detalles.length ? extras.detalles : [{ Detalle: "—", Cantidad: 0 }]);
      applyBasicStyles(wsExtrasDet);
      XLSX.utils.book_append_sheet(wb, wsExtrasDet, "Extras - Detalle otros");

      const ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const fileName = `Reporte_${empresaNombre.replace(/\s+/g, "_").replace(/[^\w]/g, "")}_${selectedYear}-${String(selectedMonth).padStart(2,"0")}_${ts}.xlsx`;

      XLSX.writeFile(wb, fileName);
      setExportStatus({ exporting: false, error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setExportStatus({ exporting: false, error: `Error al exportar reporte general: ${msg}` });
    }
  };

  /* ===== Generar PDF y mostrar en MODAL ===== */
  const abrirPDF = async () => {
    try {
      setExportStatus({ exporting: true, error: null });
      const data = await obtenerDatosReporteGeneral();
      setDataPrev(data);

      // Deja que React pinte el contenedor oculto
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise<void>((r) => setTimeout(r, 0));

      const el = previewRef.current;
      if (!el) throw new Error("No se encontró el contenedor del PDF.");

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
        onclone: (doc) => {
          const clone = doc.getElementById("pdf-preview-root") as HTMLElement | null;
          if (clone) {
            clone.style.position = "static";
            clone.style.left = "0px";
            clone.style.top = "0px";
            clone.style.opacity = "1";
            clone.style.pointerEvents = "auto";
            clone.style.transform = "none";
            clone.style.zIndex = "0";
            clone.style.width = "794px"; // Aprox A4 @96dpi
          }
        },
      });

      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const ratio = canvas.width / imgWidth;
      const pxPerPage = pageHeight * ratio;

      // cortes seguros
      const safeCuts: number[] = [];
      const rootRect = el.getBoundingClientRect();
      const scaleY = canvas.height / el.offsetHeight;

      const tables = el.querySelectorAll<HTMLTableElement>("table");
      tables.forEach((tbl) => {
        const rows = Array.from(tbl.querySelectorAll("tr"));
        rows.forEach((row) => {
          const rect = row.getBoundingClientRect();
          const y = (rect.bottom - rootRect.top) * scaleY;
          safeCuts.push(Math.round(y));
        });
        const tblRect = tbl.getBoundingClientRect();
        const yEnd = (tblRect.bottom - rootRect.top) * scaleY;
        safeCuts.push(Math.round(yEnd + 6 * ratio));
      });

      const heads = el.querySelectorAll("h4");
      heads.forEach((h) => {
        const r = h.getBoundingClientRect();
        const yTop = (r.top - rootRect.top) * scaleY;
        safeCuts.push(Math.max(0, Math.round(yTop - 8 * ratio)));
      });

      safeCuts.sort((a, b) => a - b);
      const uniqueCuts = Array.from(new Set(safeCuts.filter((y) => y > 0 && y < canvas.height)));

      let yCursor = 0;
      let pageIndex = 0;
      while (yCursor < canvas.height) {
        const pageBottom = yCursor + pxPerPage;
        const candidate = uniqueCuts
          .filter((y) => y > yCursor + 20 && y <= pageBottom - 20)
          .pop();

        const sliceEnd = candidate ?? Math.min(pageBottom, canvas.height);
        const sliceHeight = Math.max(1, Math.round(sliceEnd - yCursor));

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;

        const pageCtx = pageCanvas.getContext("2d");
        if (!pageCtx) break;

        pageCtx.drawImage(
          canvas,
          0,
          yCursor,
          canvas.width,
          sliceHeight,
          0,
          0,
          pageCanvas.width,
          pageCanvas.height
        );

        const pageImg = pageCanvas.toDataURL("image/png");
        if (pageIndex === 0) {
          pdf.addImage(pageImg, "PNG", 0, 0, imgWidth, sliceHeight / ratio);
        } else {
          pdf.addPage();
          pdf.addImage(pageImg, "PNG", 0, 0, imgWidth, sliceHeight / ratio);
        }

        yCursor = Math.round(sliceEnd);
        pageIndex++;
      }


      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);

      setPdfUrl(url);
      setPdfModalOpen(true);
      setExportStatus({ exporting: false, error: null });
    } catch (e) {
      console.error(e);
      setExportStatus({ exporting: false, error: "No se pudo generar el PDF." });
    }
  };

  /* ===== UI ===== */
  const empresasFiltradas = empresas.filter((e) =>
    e.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const goToDashboard = () => navigate("/");
  const goToAnalytics = () => navigate("/empresas");

  const labelStyle: React.CSSProperties = { fontSize: 12, color: "#64748B", marginBottom: 2 };
  const valueStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: "#0F172A" };
  const cellBorder: React.CSSProperties = { border: "1px solid #E5E7EB", padding: "6px 8px", fontSize: 12, color: "#0F172A" };
  const cellHeader: React.CSSProperties = { ...cellBorder, background: "#F1F5F9", fontWeight: 700 };

  const empresaNombrePreview =
    empresas.find((e) => e.id_empresa === Number(empresaFiltro))?.nombre || TEXTO_FIJO.paraDefault;

  const previewSlaRows: SlaRow[] = buildSlaResolutionFromTickets(
    (dataPrev?.tickets ?? []) as TicketLike[]
  );

  const canSelectYear = !!empresaFiltro;
  const canSelectMonth = canSelectYear && !!selectedYear;
  const canGenerate = canSelectMonth && !!selectedMonth;

  // Años (rango sensato)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => String(currentYear - i));

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-slate-50 to-white">
      <Header />

      {/* Top Nav */}
      <div className="bg-white/60 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-4">
          <button onClick={goToDashboard} className="flex items-center gap-2 text-slate-600 hover:text-blue-600">
            <HomeOutlined /> Dashboard
          </button>
          <button onClick={goToAnalytics} className="flex items-center gap-2 text-slate-600 hover:text-blue-600">
            <BarChartOutlined /> Analytics
          </button>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-8 shadow-lg mb-8"
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl"><FileExcelOutlined /></div>
            <div>
              <h1 className="text-3xl font-extrabold">Reportes Operativos</h1>
              <p className="opacity-90">
                Selecciona empresa, año y mes para generar tu informe en Word, Excel y PDF.
              </p>
              {canGenerate && (
                <div className="mt-2 text-sm flex items-center gap-2 opacity-95">
                  <CheckCircleOutlined />
                  {empresaNombrePreview} · {periodoTexto}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {globalError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {globalError}
          </motion.div>
        )}

        {/* Wizard */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Paso 1: Empresa */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3 text-indigo-700 font-semibold">
              <ApartmentOutlined />
              Paso 1 · Empresa
            </div>
            <label className="block text-sm text-slate-600 mb-2">Buscar</label>
            <div className="relative mb-3">
              <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full"
              />
            </div>
            <label className="block text-sm text-slate-600 mb-2">Seleccionar empresa</label>
            <select
              value={empresaFiltro}
              onChange={(e) => { setEmpresaFiltro(e.target.value); setSelectedYear(""); setSelectedMonth(""); }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">— Selecciona —</option>
              {empresasFiltradas.map((empresa) => (
                <option key={empresa.id_empresa} value={String(empresa.id_empresa)}>
                  {empresa.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Paso 2: Año */}
          <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-5 ${!canSelectYear ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex items-center gap-2 mb-3 text-indigo-700 font-semibold">
              <CalendarOutlined />
              Paso 2 · Año
            </div>
            <label className="block text-sm text-slate-600 mb-2">Seleccionar año</label>
            <select
              value={selectedYear}
              onChange={(e) => { setSelectedYear(e.target.value); setSelectedMonth(""); }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={!canSelectYear}
            >
              <option value="">— Selecciona —</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Paso 3: Mes */}
          <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-5 ${!canSelectMonth ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex items-center gap-2 mb-3 text-indigo-700 font-semibold">
              <CalendarOutlined />
              Paso 3 · Mes
            </div>
            <label className="block text-sm text-slate-600 mb-2">Seleccionar mes</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={!canSelectMonth}
            >
              <option value="">— Selecciona —</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1)}>{m}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Acciones */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={exportDOCX}
              disabled={!canGenerate || exportStatus.exporting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50"
              title={!canGenerate ? "Selecciona empresa, año y mes" : "Generar DOCX"}
            >
              {exportStatus.exporting ? (<><LoadingOutlined className="animate-spin mr-2" />Generando…</>) : (<><DownloadOutlined className="mr-2" />Descargar Word (DOCX)</>)}
            </button>

            <button
              onClick={exportReporteGeneral}
              disabled={!canGenerate || exportStatus.exporting}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50"
              title={!canGenerate ? "Selecciona empresa, año y mes" : "Generar Excel"}
            >
              <DownloadOutlined className="mr-2" />
              Descargar Respaldo (XLSX)
            </button>

            <button
              onClick={abrirPDF}
              disabled={!canGenerate || exportStatus.exporting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50"
              title={!canGenerate ? "Selecciona empresa, año y mes" : "Ver PDF en modal"}
            >
              <EyeOutlined className="mr-2" />
              Ver PDF (modal)
            </button>
          </div>

          {exportStatus.error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {exportStatus.error}
            </motion.div>
          )}
        </motion.div>

        {/* ===== Contenedor oculto para generar el PDF ===== */}
        <div
          ref={previewRef}
          id="pdf-preview-root"
          style={{
            position: "fixed",
            left: -10000,
            top: -10000,
            width: 794, // Aprox A4 @96dpi, relación 1:1 más nítida
            background: "#FFFFFF",
            color: "#0F172A",
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            opacity: 0,
            pointerEvents: "none",
            zIndex: -1,
          }}
        >
          {/* Portada (logo + banda) */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
            <img
              src="/login/LOGO_RIDS.png"
              alt="RIDS"
              style={{ height: 44, width: "auto", objectFit: "contain" }}
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
            />
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1F2937" }}>{docxTitulo}</div>
          </div>

          <div style={{ background: "linear-gradient(90deg,#111827 0%,#1F2937 100%)", color: "#FFFFFF", borderRadius: 10, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{docxSubtitulo}</div>
            <div style={{ marginTop: 8, opacity: 0.9 }}>{TEXTO_FIJO.correo} · Periodo: {periodoTexto || "—"}</div>
            <div style={{ marginTop: 10, fontWeight: 700 }}>{TEXTO_FIJO.folio}</div>
          </div>

          {/* Para/De/Asunto/Fecha/Ingeniera/Técnicos */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12, marginBottom: 16 }}>
            {[
              ["Para", empresaNombrePreview],
              ["De", TEXTO_FIJO.de],
              ["Asunto", `${TEXTO_FIJO.asunto} (${periodoTexto || "—"})`],
              ["Fecha", new Date().toLocaleDateString("es-CL")],
              ["Ingeniera en conocimiento", TEXTO_FIJO.ingeniera],
              ["Técnicos en conocimientos", TEXTO_FIJO.tecnicos],
            ].map(([l, v]) => (
              <div key={l} style={{ background: "#F3F4F6", borderRadius: 8, padding: 12 }}>
                <div style={{ ...labelStyle, color: "#1F2937" }}>{l}</div>
                <div style={{ ...valueStyle, color: "#111827" }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Intro + secciones */}
          <div style={{ marginBottom: 12, fontSize: 14, lineHeight: 1.5 }}>{TEXTO_FIJO.intro}</div>

          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Antecedentes</h4>
          <div style={{ fontSize: 14 }}>{TEXTO_FIJO.antecedentes}</div>

          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Objetivos</h4>
          <div style={{ fontSize: 14 }}>{TEXTO_FIJO.objetivos}</div>

          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Métodos</h4>
          <ul style={{ fontSize: 14, paddingLeft: 18, marginTop: 4 }}>
            {TEXTO_FIJO.metodos.map((m) => (<li key={m}>{m}</li>))}
          </ul>

          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Resultados</h4>
          <ul style={{ fontSize: 14, paddingLeft: 18, marginTop: 4 }}>
            {TEXTO_FIJO.resultados.map((m) => (<li key={m}>{m}</li>))}
          </ul>

          {/* Resumen de gestión de Tickets */}
          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Resumen de gestión de Tickets</h4>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead>
              <tr>{["Tiempo", "Tickets", "Porcentaje (%) - Tiempo"].map((h) => (<th key={h} style={cellHeader}>{h}</th>))}</tr>
            </thead>
            <tbody>
              {previewSlaRows.map((r) => (
                <tr key={r.label}>
                  <td style={cellBorder}>{r.label}</td>
                  <td style={cellBorder}>{r.count}</td>
                  <td style={cellBorder}>{r.percent}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tipos de solicitud */}
          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Tipos de solicitud (desde visitas)</h4>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead>
              <tr>
                {["Tipo", "Cantidad"].map((h) => (
                  <th key={h} style={cellHeader}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contarTiposVisita(dataPrev?.visitas || []).map((r) => (
                <tr key={r.Tipo}>
                  <td style={cellBorder}>{r.Tipo}</td>
                  <td style={cellBorder}>{r.Cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Actividades de mantenimiento (visitas) */}
          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Actividades de mantenimiento (desde visitas)</h4>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead>
              <tr>
                {["Ítem", "Cantidad"].map((h) => (
                  <th key={h} style={cellHeader}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contarMantenimientos(dataPrev?.visitas || []).map((r) => (
                <tr key={r.Ítem}>
                  <td style={cellBorder}>{r.Ítem}</td>
                  <td style={cellBorder}>{r.Cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Configuraciones y otros (totales) */}
          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Configuraciones y otros (totales)</h4>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead>
              <tr>
                {["Ítem", "Cantidad"].map((h) => (
                  <th key={h} style={cellHeader}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contarExtras(dataPrev?.visitas || []).totales.map((r) => (
                <tr key={r.Ítem}>
                  <td style={cellBorder}>{r.Ítem}</td>
                  <td style={cellBorder}>{r.Cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Detalle Otros */}
          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Detalle de “Otros”</h4>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead>
              <tr>
                {["Detalle otros", "Cantidad"].map((h) => (
                  <th key={h} style={cellHeader}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(contarExtras(dataPrev?.visitas || []).detalles || [{ Detalle: "—", Cantidad: 0 }]).map((d, i) => (
                <tr key={i}>
                  <td style={cellBorder}>{d.Detalle}</td>
                  <td style={cellBorder}>{d.Cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Correos activos */}
          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Listado de correos activos</h4>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead>
              <tr>
                {["Nro", "Nombre", "Correo electrónico"].map((h) => (
                  <th key={h} style={cellHeader}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(dataPrev?.solicitantes || []).slice(0, 400).map((s, i) => (
                <tr key={s.id_solicitante}>
                  <td style={cellBorder}>{i + 1}</td>
                  <td style={cellBorder}>{s.nombre}</td>
                  <td style={cellBorder}>{s.email || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Inventario con solicitante */}
          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Inventario de equipamiento (con solicitante)</h4>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead>
              <tr>
                {["Serial", "Marca", "Modelo", "RAM", "Disco", "Propiedad", "Solicitante"].map((h) => (
                  <th key={h} style={cellHeader}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(dataPrev?.equipos || []).slice(0, 400).map((e, i) => {
                const solicitante =
                  e.idSolicitante != null
                    ? ((dataPrev?.solicitantes || []).find(
                        (s) => s.id_solicitante === e.idSolicitante
                      )?.nombre ?? "")
                    : "";
                return (
                  <tr key={i}>
                    <td style={cellBorder}>{e.serial ?? ""}</td>
                    <td style={cellBorder}>{e.marca ?? ""}</td>
                    <td style={cellBorder}>{e.modelo ?? ""}</td>
                    <td style={cellBorder}>{e.ram ?? ""}</td>
                    <td style={cellBorder}>{e.disco ?? ""}</td>
                    <td style={cellBorder}>{e.propiedad ?? ""}</td>
                    <td style={cellBorder}>{solicitante}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Observaciones */}
          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Observaciones del periodo</h4>
          <div style={{ fontSize: 14 }}>
            {observaciones || "Sin observaciones adicionales."}
          </div>
        </div>
        {/* ==== fin del contenedor oculto para PDF ==== */}

        {/* Panel de edición rápida */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mt-6"
        >
          <h3 className="font-bold text-slate-800 mb-6 text-xl flex items-center justify-center">
            <BuildOutlined className="mr-3 text-slate-600" />
            Portada y observaciones
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-slate-600 mb-2">Título</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                value={docxTitulo}
                onChange={(e) => setDocxTitulo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-2">Subtítulo</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                value={docxSubtitulo}
                onChange={(e) => setDocxSubtitulo(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm text-slate-600 mb-2">Observaciones</label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              rows={4}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Agrega notas u observaciones del periodo..."
            />
          </div>
        </motion.div>
      </main>

      {/* ===== Modal PDF interno ===== */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/60" onClick={closePdfModal} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <div className="font-semibold text-slate-800 flex items-center gap-2">
                  <EyeOutlined />
                  Vista previa PDF
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadPdf}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white"
                  >
                    <DownloadOutlined /> Descargar
                  </button>
                  <button
                    onClick={printPdf}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <PrinterOutlined /> Imprimir
                  </button>
                  <button
                    onClick={closePdfModal}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800"
                    title="Cerrar"
                  >
                    <CloseOutlined />
                  </button>
                </div>
              </div>
              <div className="h-[80vh] bg-slate-50">
                {pdfUrl ? (
                  <iframe
                    ref={iframeRef}
                    src={pdfUrl}
                    className="w-full h-full"
                    title="Vista previa PDF"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    <LoadingOutlined className="mr-2 animate-spin" /> Cargando PDF…
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay suave durante generación */}
      {exportStatus.exporting && (
        <div className="fixed inset-0 z-[90] pointer-events-none">
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow border border-slate-200 text-slate-700 flex items-center gap-2">
              <LoadingOutlined className="animate-spin" /> Generando…
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportesPage;
