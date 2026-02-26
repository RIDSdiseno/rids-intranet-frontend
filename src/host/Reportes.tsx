// src/pages/ReportesPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  RiseOutlined,
  FallOutlined,
  TeamOutlined,
  ToolOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx-js-style";

import type { ITableBordersOptions } from "docx";
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
} from "docx";
import { saveAs } from "file-saver";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  BarController,
  ArcElement,
  PieController,
  LineController,
  LineElement,
  PointElement,
} from "chart.js";

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  ArcElement,
  PieController,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

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

type VisitasPorTipoRow = { tipo: string; cantidad: number };
type VisitasPorTecnicoRow = { tecnico: string; cantidad: number };
type MantencionesPorStatusRow = { status: string; cantidad: number };

type VisitaDetalleRow = {
  inicio: string | Date;
  fin: string | Date | null;
  solicitante: string | null;
  tecnico?: { nombre?: string | null } | null;
  sucursal?: { nombre?: string | null } | null;
  otrosDetalle?: string | null;
};

type EquipoInventarioRow = {
  serial?: string | null;
  marca?: string | null;
  modelo?: string | null;
  procesador?: string | null;
  ram?: string | null;
  disco?: string | null;
  propiedad?: string | null;
  solicitante?: { nombre?: string | null } | null;
};

type TicketDetalleRow = {
  id: string;
  subject: string;
  type: string | null;
  status: number;
  createdAt: string;
  requesterEmail?: string | null;
  ticketRequester?: {
    name?: string | null;
    email?: string | null;
  } | null;
};

type MantencionDetalleRow = {
  id_mantencion: number;
  inicio: string;
  fin: string | null;
  status: string;
  solicitante: string;
  tecnico?: { nombre: string };
};

// 🔥 Tipo para solicitantes del CRM
type UsuarioCRM = {
  usuario: string;
  email?: string;
};

interface ReporteEmpresaData {
  empresa: { id_empresa: number; nombre: string };
  month: string;

  kpis: {
    visitas: { count: number; totalMs: number; avgMs: number };
    equipos: { count: number };
    tickets: { total: number; usuariosActivos: number };
    mantenciones: { total: number };
  };

  visitasPorTipo: VisitasPorTipoRow[];
  visitasPorTecnico: VisitasPorTecnicoRow[];
  visitasDetalle: VisitaDetalleRow[];

  inventario: {
    equipos: EquipoInventarioRow[];
  };

  tickets: {
    total: number;
    topUsuarios: { usuario: string; email?: string; cantidad: number }[];
    detalle: TicketDetalleRow[];
    usuariosListado: { usuario: string; email?: string; cantidad: number }[];
  };

  // 🔥 NUEVO: todos los solicitantes del CRM de la empresa
  usuariosCRM: UsuarioCRM[];

  mantenciones: {
    total: number;
    detalle: MantencionDetalleRow[];
    porStatus: MantencionesPorStatusRow[];
  };

  narrativa: { resumen: string };
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
    "Mantenimientos preventivos y correctivos (remotos y presenciales).",
    "Emisión de informes mensuales con solicitudes e incidencias gestionadas.",
  ],
  resultados: [
    "Se consolida la actividad operacional del periodo por empresa.",
    "Se presentan métricas, distribución por tipo y detalle de registros.",
  ],
  correo: "soporte@rids.cl",
};

/* ===================== Helpers ===================== */
const tokenHeader = (): HeadersInit => {
  const token = localStorage.getItem("accessToken");
  const h: Record<string, string> = {};
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};

const generarFolio = (empresa: string) => {
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `Folio: ${empresa}-${fecha}`;
};

const safeDate = (v: unknown): Date | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};

const toCLDate = (v: unknown) => {
  const d = safeDate(v);
  return d ? d.toLocaleDateString("es-CL") : "—";
};

const toCLTime = (v: unknown, withSeconds = false) => {
  const d = safeDate(v);
  return d
    ? d.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
      ...(withSeconds ? { second: "2-digit" } : {}),
    })
    : "—";
};

const toCLDateTime = (v: unknown) => {
  const d = safeDate(v);
  return d ? d.toLocaleString("es-CL") : "—";
};

const ymLabel = (year: string, month: string) => {
  const MONTHS_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const m = Number(month);
  if (!year || !month || !m || m < 1 || m > 12) return "";
  return `${MONTHS_NAMES[m - 1]} ${year}`;
};

/* ===================== Charts helpers ===================== */
const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const generateBarChart = async (
  canvasId: string,
  labels: string[],
  data: number[],
  title: string,
  color = "#2563EB"
): Promise<string | null> => {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: title, data, backgroundColor: color, borderColor: color, borderWidth: 1, borderRadius: 6, barPercentage: 0.75 }],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: { legend: { display: true, position: "top" }, title: { display: true, text: title } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxRotation: 40, minRotation: 0 } } },
      animation: false,
    },
  });
  await new Promise((r) => setTimeout(r, 80));
  const url = canvas.toDataURL("image/png", 1.0);
  chart.destroy();
  return url;
};

const generatePieChart = async (
  canvasId: string,
  labels: string[],
  data: number[],
  title: string
): Promise<string | null> => {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const backgroundColors = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#4F46E5"];
  const chart = new Chart(ctx, {
    type: "pie",
    data: { labels, datasets: [{ label: title, data, backgroundColor: backgroundColors, borderColor: "#FFFFFF", borderWidth: 2 }] },
    options: {
      responsive: false, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: "bottom" }, title: { display: true, text: title } },
      animation: false,
    },
  });
  await new Promise((r) => setTimeout(r, 80));
  const url = canvas.toDataURL("image/png", 1.0);
  chart.destroy();
  return url;
};

/* ===================== DOCX style helpers ===================== */
const THEME = {
  primary: "1F2937", primaryLight: "F3F4F6", text: "0F172A",
  textMuted: "475569", border: "E5E7EB", zebra: "F9FAFB", accent: "2563EB",
};

const H1 = (t: string) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 260, after: 140, line: 360 }, children: [new TextRun({ text: t, bold: true })] });
const H2 = (t: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100, line: 340 }, children: [new TextRun({ text: t, bold: true })] });
const Body = (t: string) => new Paragraph({ spacing: { after: 140, line: 320 }, children: [new TextRun({ text: t, color: THEME.text })] });
const Note = (t: string) => new Paragraph({ spacing: { before: 40, after: 160 }, children: [new TextRun({ text: t, italics: true, color: THEME.textMuted })] });
const Divider = () => new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: THEME.border } }, spacing: { after: 220 } });

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
  rows: Array<Record<string, string | number>>,
  columnWidths?: number[]
): Table[] => {
  const tables: Table[] = [];
  const defaultColumnWidth = 100 / headers.length;
  const widths = columnWidths || Array(headers.length).fill(defaultColumnWidth);

  const headerCells = headers.map((h, colIndex) =>
    new TableCell({
      shading: { fill: THEME.primary },
      verticalAlign: VerticalAlign.CENTER,
      width: { size: widths[colIndex], type: WidthType.PERCENTAGE },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20 })] })],
    })
  );

  const bodyRows = rows.map((r, idx) => {
    const bg = idx % 2 === 0 ? THEME.zebra : "FFFFFF";
    return new TableRow({
      children: headers.map((k, colIndex) => {
        const v = r[k];
        const alignment = typeof v === "number" ? AlignmentType.RIGHT
          : k.toLowerCase().includes("fecha") || k.toLowerCase().includes("hora") || k.toLowerCase().includes("inicio") || k.toLowerCase().includes("fin")
            ? AlignmentType.CENTER : AlignmentType.LEFT;
        return new TableCell({
          shading: { fill: bg },
          verticalAlign: VerticalAlign.CENTER,
          width: { size: widths[colIndex], type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment, children: [new TextRun({ text: String(v ?? ""), color: THEME.text, size: 18 })] })],
        });
      }),
    });
  });

  tables.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [new TableRow({ children: [new TableCell({ borders: noBorders, children: [new Paragraph({ spacing: { before: 80, after: 40 }, children: [new TextRun({ text: caption, italics: true, color: THEME.textMuted, size: 18 })] })] })] })],
  }));
  tables.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: headerCells }), ...bodyRows] }));
  return tables;
};

const fetchLogoBytes = async (): Promise<Uint8Array | null> => {
  try {
    const res = await fetch("/login/LOGO_RIDS.png", { cache: "no-store" });
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch { return null; }
};

const portada = (logoBytes: Uint8Array | null, titulo: string, subtitulo: string, empresa: string, periodo: string) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: noBorders, width: { size: 65, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({ spacing: { after: 160 }, children: [logoBytes ? new ImageRun({ data: logoBytes, type: "png", transformation: { width: 200, height: 60 } }) : new TextRun({ text: "Asesorías RIDS Ltda.", bold: true, size: 36 })] }),
            new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: titulo, bold: true, size: 58, color: THEME.primary })] }),
            new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: subtitulo, size: 28, color: THEME.textMuted })] }),
            new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: THEME.border } }, spacing: { before: 40, after: 120 }, children: [new TextRun({ text: `${empresa} · ${periodo}`, size: 26, color: THEME.text })] }),
          ],
        }),
        new TableCell({
          borders: noBorders, width: { size: 35, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 90, after: 0 }, children: [new TextRun({ text: generarFolio(empresa), color: THEME.accent, bold: true })] }),
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: TEXTO_FIJO.correo, color: THEME.textMuted })] }),
          ],
        }),
      ],
    })],
  });

const buildHeader = (empresa: string) => new DocxHeader({ children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: `Informe Operativo · ${empresa}`, color: THEME.textMuted })] })] });
const buildFooter = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Página " }), new TextRun({ children: [PageNumber.CURRENT] }), new TextRun({ text: " de " }), new TextRun({ children: [PageNumber.TOTAL_PAGES] }), new TextRun({ text: "  ·  soporte@rids.cl" })] })] });

/* ===================== KPI Cards ===================== */
const KPICards: React.FC<{ data: ReporteEmpresaData }> = ({ data }) => {
  const kpis = [
    { title: "Tickets del periodo", value: data.kpis.tickets.total, color: "green", icon: <CheckCircleOutlined />, description: "Tickets asociados (Freshdesk)" },
    { title: "Visitas realizadas", value: data.kpis.visitas.count, color: "blue", icon: <ToolOutlined />, description: "Visitas presenciales / registro web" },
    { title: "Mantenciones remotas", value: data.kpis.mantenciones.total, color: "purple", icon: <ClockCircleOutlined />, description: "Registros remotos del periodo" },
    { title: "Equipos registrados", value: data.kpis.equipos.count, color: "orange", icon: <BuildOutlined />, description: "Inventario asociado" },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpis.map((kpi, index) => (
        <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}
          className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-lg ${kpi.color === "green" ? "bg-green-100 text-green-600" : kpi.color === "blue" ? "bg-blue-100 text-blue-600" : kpi.color === "purple" ? "bg-purple-100 text-purple-600" : "bg-orange-100 text-orange-600"}`}>
              {kpi.icon}
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <RiseOutlined />
            </div>
          </div>
          <p className="text-slate-600 text-sm font-medium mb-1">{kpi.title}</p>
          <p className="text-3xl font-bold text-slate-900 mb-1">{Number(kpi.value || 0).toLocaleString()}</p>
          <p className="text-slate-500 text-xs">{kpi.description}</p>
        </motion.div>
      ))}
    </div>
  );
};

/* ===================== 🔥 Componente SolicitantesCRM ===================== */
const SolicitantesCRMPanel: React.FC<{ usuarios: UsuarioCRM[] }> = ({ usuarios }) => {
  const [busqueda, setBusqueda] = useState("");
  const filtrados = usuarios
    .filter(u => u.usuario.toLowerCase().includes(busqueda.toLowerCase()) || (u.email ?? "").toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => a.usuario.localeCompare(b.usuario));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
            <TeamOutlined className="text-white text-lg" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">Directorio de Solicitantes</div>
            <div className="text-slate-400 text-xs">{usuarios.length} contactos registrados en el CRM</div>
          </div>
        </div>
        <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
          {filtrados.length} de {usuarios.length}
        </span>
      </div>

      {/* Buscador */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="relative">
          <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/30"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="overflow-auto max-h-72 divide-y divide-slate-50">
        {filtrados.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            <UserOutlined className="text-2xl mb-2 block" />
            No se encontraron solicitantes
          </div>
        ) : (
          filtrados.map((u, idx) => (
            <div key={u.usuario + idx} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {u.usuario.charAt(0).toUpperCase()}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{u.usuario}</div>
                <div className="flex items-center gap-3 mt-0.5">
                  {u.email && (
                    <span className="flex items-center gap-1 text-xs text-slate-500 truncate">
                      <MailOutlined className="text-slate-400 flex-shrink-0" />
                      {u.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/* ===================== Componente ===================== */
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const ReportesPage: React.FC = () => {
  const navigate = useNavigate();

  const [exportStatus, setExportStatus] = useState<ExportStatus>({ exporting: false, error: null });
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaFiltro, setEmpresaFiltro] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [docxTitulo, setDocxTitulo] = useState<string>("Informe Operativo");
  const [docxSubtitulo, setDocxSubtitulo] = useState<string>(TEXTO_FIJO.subtitulo);
  const [recomendaciones, setRecomendaciones] = useState<string>("");

  const previewRef = useRef<HTMLDivElement>(null);
  const [dataPrev, setDataPrev] = useState<ReporteEmpresaData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const closePdfModal = () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); setPdfUrl(null); setPdfModalOpen(false); };
  const printPdf = () => { const iframe = iframeRef.current; if (iframe?.contentWindow) { iframe.contentWindow.focus(); iframe.contentWindow.print(); } };
  const downloadPdf = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a"); a.href = pdfUrl;
    a.download = `Reporte_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
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

  /* ===== XLSX styles ===== */
  const applyBasicStyles = (worksheet: XLSX.WorkSheet): XLSX.WorkSheet => {
    const ref = worksheet["!ref"];
    if (!ref) return worksheet;
    const headerStyle: XLSX.CellStyle = {
      font: { bold: true, color: { rgb: "FFFFFFFF" } },
      fill: { fgColor: { rgb: "FF1F2937" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: { top: { style: "thin", color: { rgb: "FFE5E7EB" } }, bottom: { style: "thin", color: { rgb: "FFE5E7EB" } }, left: { style: "thin", color: { rgb: "FFE5E7EB" } }, right: { style: "thin", color: { rgb: "FFE5E7EB" } } },
    };
    const cellBorder: XLSX.CellStyle["border"] = { top: { style: "thin", color: { rgb: "FFE5E7EB" } }, bottom: { style: "thin", color: { rgb: "FFE5E7EB" } }, left: { style: "thin", color: { rgb: "FFE5E7EB" } }, right: { style: "thin", color: { rgb: "FFE5E7EB" } } };
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
      for (let i = 0; i < max; i++) cols.push({ wch: 22 });
      worksheet["!cols"] = cols;
    }
    return worksheet;
  };

  /* ===== Fetch reporte ===== */
  const fetchReporteEmpresa = async (empresaId: string, year: string, month: string): Promise<ReporteEmpresaData> => {
    const ym = `${year}-${String(month).padStart(2, "0")}`;
    const url = `${API_URL}/reportes/empresa/${empresaId}?month=${encodeURIComponent(ym)}`;
    const r = await fetch(url, { headers: tokenHeader() });
    if (!r.ok) { const text = await r.text().catch(() => ""); throw new Error(`HTTP ${r.status} ${text}`); }
    return (await r.json()) as ReporteEmpresaData;
  };

  const obtenerReporte = async (): Promise<ReporteEmpresaData> => {
    if (!empresaFiltro || !selectedYear || !selectedMonth) throw new Error("Selecciona empresa, año y mes");
    return await fetchReporteEmpresa(empresaFiltro, selectedYear, selectedMonth);
  };

  const previsualizarDatos = async () => {
    try {
      setExportStatus({ exporting: true, error: null });
      const data = await obtenerReporte();
      setDataPrev(data);
      setShowPreview(true);
      setExportStatus({ exporting: false, error: null });
    } catch (error) {
      console.error(error);
      setExportStatus({ exporting: false, error: "Error al cargar datos para previsualización" });
    }
  };

  const computeEquiposPorMarca = (equipos: EquipoInventarioRow[]) => {
    const map: Record<string, number> = {};
    for (const e of equipos) { const marca = (e.marca ?? "").trim() || "Sin marca"; map[marca] = (map[marca] || 0) + 1; }
    const labels = Object.keys(map);
    const values = labels.map((k) => map[k]);
    return { labels, values };
  };

  /* =============== Export DOCX =============== */
  const exportDOCX = async () => {
    try {
      setExportStatus({ exporting: true, error: null });
      const data = await obtenerReporte();
      const empresaNombre = data.empresa?.nombre || TEXTO_FIJO.paraDefault;
      const periodoTexto = ymLabel(selectedYear, selectedMonth) || data.month || TEXTO_FIJO.fecha;

      const visitasRows = (data.visitasDetalle ?? []).map((v) => ({
        Técnico: v.tecnico?.nombre ?? "—", Fecha: toCLDate(v.inicio),
        Horario: safeDate(v.inicio) && safeDate(v.fin) ? `${toCLTime(v.inicio)} - ${toCLTime(v.fin)}` : "—",
        Usuario: v.solicitante ?? "—", Sucursal: v.sucursal?.nombre ?? "—", Observación: (v.otrosDetalle ?? "").trim() || "—",
      }));

      const mantRows = (data.mantenciones?.detalle ?? []).map((m) => ({
        ID: m.id_mantencion, Técnico: m.tecnico?.nombre ?? "—",
        Inicio: `${toCLDate(m.inicio)} ${toCLTime(m.inicio)}`,
        Fin: m.fin ? `${toCLDate(m.fin)} ${toCLTime(m.fin)}` : "—",
        Estado: (m.status ?? "").toUpperCase(), Usuario: m.solicitante ?? "—",
      }));

      const mapStatus = (status: number) => ({ 2: "Abierto", 3: "Pendiente", 4: "Resuelto", 5: "Cerrado" }[status] ?? String(status));

      const ticketsRows = (data.tickets?.detalle ?? []).map((t) => ({
        ID: t.id, Asunto: t.subject ?? "—", Estado: mapStatus(t.status), Categoría: t.type ?? "—", Fecha: toCLDateTime(t.createdAt),
      }));

      const inventarioRows = (data.inventario?.equipos ?? []).map((e) => ({
        Serial: e.serial ?? "", Marca: e.marca ?? "", Modelo: e.modelo ?? "",
        RAM: e.ram ?? "", Disco: e.disco ?? "", Propiedad: e.propiedad ?? "", Usuario: e.solicitante?.nombre ?? "",
      }));

      const visitasPorTipoRows = (data.visitasPorTipo ?? []).map((r) => ({ Tipo: r.tipo, Cantidad: r.cantidad }));
      const visitasPorTecnicoRows = (data.visitasPorTecnico ?? []).map((r) => ({ Técnico: r.tecnico, Cantidad: r.cantidad }));
      const mantPorStatusRows = (data.mantenciones?.porStatus ?? []).map((r) => ({ Status: r.status, Cantidad: r.cantidad }));

      // 🔥 Rows del directorio CRM para DOCX
      const crmRows = (data.usuariosCRM ?? []).map(u => ({
        Nombre: u.usuario,
        Email: u.email ?? "—",
      }));

      const logoBytes = await fetchLogoBytes();
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise<void>((r) => setTimeout(r, 60));

      const visitasTipoChartUrl = data.visitasPorTipo?.length ? await generatePieChart("chart-visitas-tipo-docx", data.visitasPorTipo.map(x => x.tipo), data.visitasPorTipo.map(x => x.cantidad), "Visitas: Programadas vs Adicionales") : null;
      const visitasTecnicoChartUrl = data.visitasPorTecnico?.length ? await generateBarChart("chart-visitas-tecnico-docx", data.visitasPorTecnico.map(x => x.tecnico), data.visitasPorTecnico.map(x => x.cantidad), "Visitas por técnico", "#10B981") : null;
      const mantPorStatus = data.mantenciones?.porStatus ?? [];

      const soloUnEstado =
        mantPorStatus.length === 1 &&
        mantPorStatus[0].status?.toUpperCase() === "COMPLETADA";

      let mantStatusChartUrl: string | null = null;

      if (!soloUnEstado && mantPorStatus.length > 0) {
        mantStatusChartUrl = await generatePieChart(
          "chart-mant-status-docx",
          mantPorStatus.map(x => x.status),
          mantPorStatus.map(x => x.cantidad),
          "Mantenciones remotas por estado"
        );
      }
      const mantStatusBytes =
        mantStatusChartUrl
          ? dataUrlToUint8Array(mantStatusChartUrl)
          : null;
      const { labels: marcasLabels, values: marcasValues } = computeEquiposPorMarca(data.inventario?.equipos ?? []);
      const invMarcaChartUrl = marcasLabels.length ? await generateBarChart("chart-inv-marca-docx", marcasLabels, marcasValues, "Inventario: equipos por marca", "#8B5CF6") : null;

      const visitasTipoBytes = visitasTipoChartUrl ? dataUrlToUint8Array(visitasTipoChartUrl) : null;
      const visitasTecnicoBytes = visitasTecnicoChartUrl ? dataUrlToUint8Array(visitasTecnicoChartUrl) : null;
      const invMarcaBytes = invMarcaChartUrl ? dataUrlToUint8Array(invMarcaChartUrl) : null;

      // Dentro de exportDOCX, junto a los otros charts:
      const topUsuariosChartUrl =
        data.tickets?.topUsuarios?.length
          ? await generateBarChart(
            "chart-top-usuarios-docx",
            data.tickets.topUsuarios.slice(0, 5).map(u => u.email || u.usuario), // solo primer nombre para que quepa
            data.tickets.topUsuarios.slice(0, 5).map(u => u.cantidad),
            "Top usuarios con más tickets",
            "#6366F1"
          )
          : null;

      const topUsuariosBytes = topUsuariosChartUrl ? dataUrlToUint8Array(topUsuariosChartUrl) : null;

      const kpis = [
        { label: "Tickets del periodo", value: data.kpis.tickets.total },
        { label: "Visitas técnicas", value: data.kpis.visitas.count },
        { label: "Mantenciones remotas", value: data.kpis.mantenciones.total },
        { label: "Equipos registrados", value: data.kpis.equipos.count },
      ];

      const docChildren: (Paragraph | Table)[] = [
        portada(logoBytes, docxTitulo, docxSubtitulo, empresaNombre, periodoTexto),
        Divider(),
        H1("Resumen Ejecutivo"),
        Body(data.narrativa?.resumen?.trim() || `Durante el periodo ${periodoTexto}, se registraron ${data.kpis.visitas.count} visitas técnicas, ${data.kpis.mantenciones.total} mantenciones remotas, ${data.kpis.equipos.count} equipos y ${data.kpis.tickets.total} tickets asociados.`),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({ children: kpis.map(k => new TableCell({ shading: { fill: THEME.primaryLight }, children: [new Paragraph({ children: [new TextRun({ text: String(k.value), bold: true, size: 36, color: THEME.primary })] }), new Paragraph({ children: [new TextRun({ text: k.label, size: 20, color: THEME.textMuted })] })] })) })],
        }),
        Note("Los KPIs corresponden a la empresa y periodo seleccionados."),
        H1("Contexto y Alcance"),
        H2("Antecedentes"), Body(TEXTO_FIJO.antecedentes),
        H2("Objetivos"), Body(TEXTO_FIJO.objetivos),
        H2("Métodos"), ...TEXTO_FIJO.metodos.map(m => Body("• " + m)),
        H2("Resultados"), ...TEXTO_FIJO.resultados.map(m => Body("• " + m)),
        H1("Análisis Operacional"),
        Body("Se presenta la distribución de actividad del periodo (visitas presenciales, mantenciones remotas e inventario)."),
        H2("Visitas: Programadas vs Adicionales"),
        ...(visitasTipoBytes ? [new Paragraph({ children: [new ImageRun({ data: visitasTipoBytes, type: "png", transformation: { width: 480, height: 320 } })] })] : tablePro("Distribución de visitas por tipo.", ["Tipo", "Cantidad"], visitasPorTipoRows)),
        H2("Visitas por técnico"),
        ...(visitasTecnicoBytes ? [new Paragraph({ children: [new ImageRun({ data: visitasTecnicoBytes, type: "png", transformation: { width: 600, height: 320 } })] })] : tablePro("Cantidad de visitas por técnico.", ["Técnico", "Cantidad"], visitasPorTecnicoRows)),
        H2("Estado de mantenciones remotas"),

        ...(soloUnEstado
          ? [
            Body(
              `Durante el periodo, el 100% de las mantenciones remotas fueron completadas exitosamente (${mantPorStatus[0].cantidad} registros).`
            ),
          ]
          : mantStatusBytes
            ? [
              new Paragraph({
                children: [
                  new ImageRun({
                    data: mantStatusBytes,
                    type: "png",
                    transformation: { width: 480, height: 320 },
                  }),
                ],
              }),
            ]
            : tablePro(
              "Mantenciones remotas agrupadas por estado.",
              ["Status", "Cantidad"],
              mantPorStatus
            )
        ),
        H2("Inventario: equipos por marca"),
        ...(invMarcaBytes ? [new Paragraph({ children: [new ImageRun({ data: invMarcaBytes, type: "png", transformation: { width: 600, height: 320 } })] })] : tablePro("Distribución de equipos por marca.", ["Marca", "Cantidad"], marcasLabels.map(marca => ({ Marca: marca, Cantidad: String(marcasValues[marcasLabels.indexOf(marca)] ?? 0) })))),
      ];

      docChildren.push(
        Divider(),
        H1("Detalle de Gestión"),
        H2("Top 5 usuarios con más solicitudes"),
        ...(topUsuariosBytes
          ? [new Paragraph({ children: [new ImageRun({ data: topUsuariosBytes, type: "png", transformation: { width: 600, height: 300 } })] })]
          : tablePro("Usuarios con mayor volumen de tickets.", ["Usuario", "Cantidad"],
            (data.tickets.topUsuarios ?? []).slice(0, 5).map(u => ({ Usuario: u.usuario, Cantidad: u.cantidad })), [70, 30])
        ),
        // 🔥 Directorio completo CRM
        H2("Directorio completo de solicitantes (CRM)"),
        ...tablePro(
          `Todos los solicitantes para esta empresa (${crmRows.length} contactos).`,
          ["Nombre", "Email"],
          crmRows,
          [40, 40, 20]
        ),
        H2("Detalle de tickets del periodo"),
        ...tablePro("Detalle de tickets del periodo.", ["ID", "Asunto", "Estado", "Categoría", "Fecha"], ticketsRows.slice(0, 800), [10, 40, 15, 15, 20]),
        H2("Visitas Técnicas (detalle)"),
        ...tablePro("Detalle de visitas registradas en el periodo.", ["Técnico", "Fecha", "Horario", "Usuario", "Sucursal", "Observación"], visitasRows.slice(0, 800), [14, 12, 14, 18, 14, 28]),
        H2("Mantenciones Remotas (detalle)"),
        ...tablePro("Detalle de mantenciones remotas del periodo.", ["ID", "Técnico", "Inicio", "Fin", "Estado", "Usuario"], mantRows.slice(0, 800), [8, 18, 18, 18, 14, 24]),
        H2("Inventario de Equipamiento (detalle)"),
        ...tablePro("Inventario asociado a la empresa.", ["Serial", "Marca", "Modelo", "RAM", "Disco", "Propiedad", "Usuario"], inventarioRows.slice(0, 800), [16, 14, 16, 10, 10, 12, 22]),
        H1("Recomendaciones del periodo"),
        Body(recomendaciones?.trim() || "Sin recomendaciones adicionales para el periodo."),
        Divider()
      );

      const doc = new Document({
        styles: { default: { document: { run: { font: "Calibri", size: 22, color: THEME.text } } } },
        sections: [{
          properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } }, type: SectionType.CONTINUOUS },
          headers: { default: buildHeader(empresaNombre) },
          footers: { default: buildFooter() },
          children: docChildren,
        }],
      });

      const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const fileName = `Informe_${empresaNombre}_${periodoTexto || "Periodo"}.docx`;
      const blob = await Packer.toBlob(doc);
      saveAs(blob, fileName);

      try {
        const base64Docx = await blobToBase64(blob);
        await fetch(`${API_URL}/reportes-upload/upload-docx`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName, empresa: empresaNombre, periodo: periodoTexto || "Periodo", fileBase64: base64Docx }),
        });
      } catch (e) { console.warn("Upload DOCX falló (no bloqueante):", e); }

      setExportStatus({ exporting: false, error: null });
    } catch (e) {
      console.error(e);
      setExportStatus({ exporting: false, error: "No se pudo generar el Word (DOCX)." });
    }
  };

  /* ===== Export XLSX ===== */
  const crearHojaConDatos = <T,>(wb: XLSX.WorkBook, datos: T[], nombreHoja: string, headers: string[], mapper: (row: T) => Record<string, string | number>) => {
    if (!datos.length) {
      const ws = XLSX.utils.json_to_sheet([{ Mensaje: "No hay datos disponibles" }]);
      applyBasicStyles(ws);
      XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
      return;
    }
    const rows = datos.map(mapper);
    const orderedRows = rows.map(r => { const o: Record<string, string | number> = {}; headers.forEach(h => (o[h] = r[h] ?? "")); return o; });
    const ws = XLSX.utils.json_to_sheet(orderedRows);
    applyBasicStyles(ws);
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
  };

  const exportReporteGeneral = async () => {
    try {
      setExportStatus({ exporting: true, error: null });
      setGlobalError(null);
      const data = await obtenerReporte();
      const wb = XLSX.utils.book_new();
      const empresaNombre = data.empresa?.nombre || "Empresa";
      const periodoTexto = ymLabel(selectedYear, selectedMonth) || data.month || "-";

      const resumenData = [
        { Métrica: "Empresa", Valor: empresaNombre },
        { Métrica: "Periodo", Valor: periodoTexto },
        { Métrica: "Total Tickets", Valor: data.kpis.tickets.total },
        { Métrica: "Total Visitas", Valor: data.kpis.visitas.count },
        { Métrica: "Total Mantenciones Remotas", Valor: data.kpis.mantenciones.total },
        { Métrica: "Total Equipos", Valor: data.kpis.equipos.count },
        { Métrica: "Total Solicitantes CRM", Valor: (data.usuariosCRM ?? []).length }, // 🔥
        { Métrica: "Fecha de Reporte", Valor: new Date().toLocaleDateString("es-CL") },
        { Métrica: "Hora de Generación", Valor: new Date().toLocaleTimeString("es-CL") },
      ];
      const wsResumen = XLSX.utils.json_to_sheet(resumenData);
      applyBasicStyles(wsResumen);
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen Ejecutivo");

      // 🔥 Hoja de directorio CRM completo
      crearHojaConDatos(wb, data.usuariosCRM ?? [], "Directorio CRM", ["Nombre", "Email"],
        (u) => ({ Nombre: (u as any).usuario, Email: (u as any).email ?? "" })
      );

      crearHojaConDatos(wb, data.visitasPorTipo ?? [], "Visitas - Por Tipo", ["Tipo", "Cantidad"], (r) => ({ Tipo: (r as any).tipo, Cantidad: (r as any).cantidad }));
      crearHojaConDatos(wb, data.visitasPorTecnico ?? [], "Visitas - Por Técnico", ["Técnico", "Cantidad"], (r) => ({ Técnico: (r as any).tecnico, Cantidad: (r as any).cantidad }));
      crearHojaConDatos(wb, data.mantenciones?.porStatus ?? [], "Mantenciones - Por Estado", ["Estado", "Cantidad"], (r) => ({ Estado: (r as any).status, Cantidad: (r as any).cantidad }));
      crearHojaConDatos(wb, data.tickets?.detalle ?? [], "Tickets (detalle)", ["Fecha", "Categoría", "Estado"], (t) => ({ Fecha: toCLDateTime((t as any).createdAt), Categoría: (t as any).type ?? "—", Estado: String((t as any).status ?? "") }));
      crearHojaConDatos(wb, data.tickets?.usuariosListado ?? [], "Solicitantes (tickets)", ["Usuario", "Email", "Cantidad"], (u) => ({ Usuario: (u as any).usuario, Email: (u as any).email ?? "", Cantidad: (u as any).cantidad }));
      crearHojaConDatos(wb, data.visitasDetalle ?? [], "Visitas (detalle)", ["Fecha", "Inicio", "Fin", "Técnico", "Sucursal", "Usuario", "Observación"],
        (v) => ({ Fecha: toCLDate((v as any).inicio), Inicio: toCLTime((v as any).inicio), Fin: (v as any).fin ? toCLTime((v as any).fin) : "—", Técnico: (v as any).tecnico?.nombre ?? "—", Sucursal: (v as any).sucursal?.nombre ?? "—", Usuario: (v as any).solicitante ?? "—", Observación: ((v as any).otrosDetalle ?? "").trim() || "—" })
      );
      crearHojaConDatos(wb, data.mantenciones?.detalle ?? [], "Mantenciones (detalle)", ["ID", "Inicio", "Fin", "Estado", "Técnico", "Usuario"],
        (m) => ({ ID: (m as any).id_mantencion, Inicio: `${toCLDate((m as any).inicio)} ${toCLTime((m as any).inicio)}`, Fin: (m as any).fin ? `${toCLDate((m as any).fin)} ${toCLTime((m as any).fin)}` : "—", Estado: String((m as any).status ?? "").toUpperCase(), Técnico: (m as any).tecnico?.nombre ?? "—", Usuario: (m as any).solicitante ?? "—" })
      );
      crearHojaConDatos(wb, data.inventario?.equipos ?? [], "Inventario (detalle)", ["Serial", "Marca", "Modelo", "Procesador", "RAM", "Disco", "Propiedad", "Usuario"],
        (e) => ({ Serial: (e as any).serial ?? "", Marca: (e as any).marca ?? "", Modelo: (e as any).modelo ?? "", Procesador: (e as any).procesador ?? "", RAM: (e as any).ram ?? "", Disco: (e as any).disco ?? "", Propiedad: (e as any).propiedad ?? "", Usuario: (e as any).solicitante?.nombre ?? "" })
      );

      const ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const safeEmpresaClean = empresaNombre.replace(/\s+/g, "_").replace(/[^\w]/g, "");
      const safeYm = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
      XLSX.writeFile(wb, `Reporte_${safeEmpresaClean}_${safeYm}_${ts}.xlsx`);
      setExportStatus({ exporting: false, error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setExportStatus({ exporting: false, error: `Error al exportar reporte: ${msg}` });
    }
  };

  /* ===== PDF ===== */
  const abrirPDF = async () => {
    try {
      setExportStatus({ exporting: true, error: null });
      const data = await obtenerReporte();
      setDataPrev(data);
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise<void>((r) => setTimeout(r, 60));
      const el = previewRef.current;
      if (!el) throw new Error("No se encontró el contenedor del PDF.");
      const canvas = await html2canvas(el, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff",
        windowWidth: el.scrollWidth, windowHeight: el.scrollHeight,
        onclone: (doc) => {
          const clone = doc.getElementById("pdf-preview-root") as HTMLElement | null;
          if (clone) { clone.style.position = "static"; clone.style.left = "0px"; clone.style.top = "0px"; clone.style.opacity = "1"; clone.style.pointerEvents = "auto"; clone.style.transform = "none"; clone.style.zIndex = "0"; clone.style.width = "794px"; }
        },
      });
      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const ratio = canvas.width / imgWidth;
      const pxPerPage = pageHeight * ratio;
      let yCursor = 0; let pageIndex = 0;
      while (yCursor < canvas.height) {
        const sliceEnd = Math.min(yCursor + pxPerPage, canvas.height);
        const sliceHeight = Math.max(1, Math.round(sliceEnd - yCursor));
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width; pageCanvas.height = sliceHeight;
        const pageCtx = pageCanvas.getContext("2d");
        if (!pageCtx) break;
        pageCtx.drawImage(canvas, 0, yCursor, canvas.width, sliceHeight, 0, 0, pageCanvas.width, pageCanvas.height);
        const pageImg = pageCanvas.toDataURL("image/png");
        if (pageIndex === 0) pdf.addImage(pageImg, "PNG", 0, 0, imgWidth, sliceHeight / ratio);
        else { pdf.addPage(); pdf.addImage(pageImg, "PNG", 0, 0, imgWidth, sliceHeight / ratio); }
        yCursor = Math.round(sliceEnd); pageIndex++;
      }
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfUrl(url); setPdfModalOpen(true);
      setExportStatus({ exporting: false, error: null });
    } catch (e) {
      console.error(e);
      setExportStatus({ exporting: false, error: "No se pudo generar el PDF." });
    }
  };

  /* ===== UI ===== */
  const empresasFiltradas = empresas.filter(e => e.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
  const goToDashboard = () => navigate("/");
  const goToAnalytics = () => navigate("/empresas");
  const empresaNombrePreview = empresas.find(e => e.id_empresa === Number(empresaFiltro))?.nombre || TEXTO_FIJO.paraDefault;
  const canSelectYear = !!empresaFiltro;
  const canSelectMonth = canSelectYear && !!selectedYear;
  const canGenerate = canSelectMonth && !!selectedMonth;
  const periodoTexto = useMemo(() => ymLabel(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => String(currentYear - i));

  const cellBorder: React.CSSProperties = { border: "1px solid #E5E7EB", padding: "6px 8px", fontSize: 12, color: "#0F172A" };
  const cellHeader: React.CSSProperties = { ...cellBorder, background: "#F1F5F9", fontWeight: 700 };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: "#64748B", marginBottom: 2 };
  const valueStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: "#0F172A" };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-slate-50 to-white">
      {/* Top Nav */}
      <div className="bg-white/60 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-4">
          <button onClick={goToDashboard} className="flex items-center gap-2 text-slate-600 hover:text-blue-600"><HomeOutlined /> Dashboard</button>
          <button onClick={goToAnalytics} className="flex items-center gap-2 text-slate-600 hover:text-blue-600"><BarChartOutlined /> Analytics</button>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-8 shadow-lg mb-8">
          <div className="flex items-start gap-4">
            <div className="text-4xl"><FileExcelOutlined /></div>
            <div>
              <h1 className="text-3xl font-extrabold">Reportes Operativos</h1>
              <p className="opacity-90">Selecciona empresa, año y mes para generar el informe en Word, Excel y PDF.</p>
              {canGenerate && <div className="mt-2 text-sm flex items-center gap-2 opacity-95"><CheckCircleOutlined />{empresaNombrePreview} · {periodoTexto}</div>}
            </div>
          </div>
        </motion.div>

        {globalError && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">{globalError}</motion.div>}

        {/* Wizard */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Paso 1 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3 text-indigo-700 font-semibold"><ApartmentOutlined />Paso 1 · Empresa</div>
            <label className="block text-sm text-slate-600 mb-2">Buscar</label>
            <div className="relative mb-3">
              <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Buscar empresa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full" />
            </div>
            <label className="block text-sm text-slate-600 mb-2">Seleccionar empresa</label>
            <select value={empresaFiltro} onChange={e => { setEmpresaFiltro(e.target.value); setSelectedYear(""); setSelectedMonth(""); setShowPreview(false); setDataPrev(null); }} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <option value="">— Selecciona —</option>
              {empresasFiltradas.map(empresa => <option key={empresa.id_empresa} value={String(empresa.id_empresa)}>{empresa.nombre}</option>)}
            </select>
          </div>

          {/* Paso 2 */}
          <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-5 ${!canSelectYear ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex items-center gap-2 mb-3 text-indigo-700 font-semibold"><CalendarOutlined />Paso 2 · Año</div>
            <label className="block text-sm text-slate-600 mb-2">Seleccionar año</label>
            <select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setSelectedMonth(""); setShowPreview(false); setDataPrev(null); }} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" disabled={!canSelectYear}>
              <option value="">— Selecciona —</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Paso 3 */}
          <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-5 ${!canSelectMonth ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex items-center gap-2 mb-3 text-indigo-700 font-semibold"><CalendarOutlined />Paso 3 · Mes</div>
            <label className="block text-sm text-slate-600 mb-2">Seleccionar mes</label>
            <select value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setShowPreview(false); setDataPrev(null); }} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" disabled={!canSelectMonth}>
              <option value="">— Selecciona —</option>
              {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
            </select>
          </div>
        </motion.div>

        {/* ===== PREVISUALIZACIÓN ===== */}
        {showPreview && dataPrev && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <BarChartOutlined />Vista Previa del Reporte
            </h3>

            <KPICards data={dataPrev} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Resumen */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="font-semibold text-slate-800 mb-2">Resumen (backend)</div>
                <div className="text-slate-700 text-sm leading-relaxed">{dataPrev.narrativa?.resumen || "—"}</div>
              </div>

              {/* Distribución */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="font-semibold text-slate-800 mb-2">Distribución (visitas / mantenciones)</div>
                <div className="text-sm text-slate-700">
                  <div className="flex gap-3 flex-wrap">
                    {(dataPrev.visitasPorTipo || []).map(x => <span key={x.tipo} className="px-2 py-1 rounded-full bg-white border border-slate-200">{x.tipo}: <b>{x.cantidad}</b></span>)}
                    {(dataPrev.mantenciones?.porStatus || []).map(x => <span key={x.status} className="px-2 py-1 rounded-full bg-white border border-slate-200">{x.status}: <b>{x.cantidad}</b></span>)}
                  </div>
                </div>
              </div>

              {/* Top usuarios tickets */}
              {/* Top usuarios - Gráfico de barras horizontal */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <BarChartOutlined />
                  Top usuarios con más tickets
                </div>
                <div className="space-y-3">
                  {(() => {
                    const top = (dataPrev.tickets?.topUsuarios || []).slice(0, 5);
                    const max = top[0]?.cantidad ?? 1;
                    const colors = [
                      "from-indigo-500 to-blue-400",
                      "from-blue-500 to-cyan-400",
                      "from-cyan-500 to-teal-400",
                      "from-teal-500 to-emerald-400",
                      "from-emerald-500 to-green-400",
                    ];
                    return top.length === 0 ? (
                      <div className="text-slate-400 text-sm">— Sin datos —</div>
                    ) : (
                      top.map((u, idx) => (
                        <div key={u.usuario} className="flex items-center gap-3">
                          {/* Posición */}
                          <span className="w-5 text-xs font-bold text-slate-400 text-right flex-shrink-0">
                            #{idx + 1}
                          </span>
                          {/* Nombre */}
                          <span className="w-40 text-xs text-slate-700 truncate flex-shrink-0">
                            {u.usuario}
                          </span>
                          {/* Barra */}
                          <div className="flex-1 bg-slate-200 rounded-full h-5 overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${colors[idx]} flex items-center justify-end pr-2 transition-all duration-700`}
                              style={{ width: `${Math.max(8, (u.cantidad / max) * 100)}%` }}
                            >
                              <span className="text-white text-xs font-bold">{u.cantidad}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    );
                  })()}
                </div>
              </div>

              {/* 🔥 Directorio CRM completo (col-span-2) */}
              <div className="lg:col-span-2">
                <SolicitantesCRMPanel usuarios={dataPrev.usuariosCRM ?? []} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Acciones */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 flex-wrap mb-4">
            <button onClick={previsualizarDatos} disabled={!canGenerate || exportStatus.exporting} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50">
              <EyeOutlined className="mr-2" />Previsualizar Datos
            </button>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button onClick={exportDOCX} disabled={!canGenerate || exportStatus.exporting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50">
              {exportStatus.exporting ? <><LoadingOutlined className="animate-spin mr-2" />Generando…</> : <><DownloadOutlined className="mr-2" />Descargar Word (DOCX)</>}
            </button>
            <button onClick={exportReporteGeneral} disabled={!canGenerate || exportStatus.exporting} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50">
              <DownloadOutlined className="mr-2" />Descargar Respaldo (XLSX)
            </button>
            <button onClick={abrirPDF} disabled={!canGenerate || exportStatus.exporting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50">
              <EyeOutlined className="mr-2" />Ver PDF (modal)
            </button>
          </div>
          {exportStatus.error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">{exportStatus.error}</motion.div>}
        </motion.div>

        {/* Canvas ocultos para charts */}
        <div style={{ position: "fixed", left: -10000, top: -10000, opacity: 0, pointerEvents: "none", zIndex: -1 }}>
          <canvas id="chart-visitas-tipo-docx" width={800} height={420} />
          <canvas id="chart-visitas-tecnico-docx" width={900} height={420} />
          <canvas id="chart-mant-status-docx" width={800} height={420} />
          <canvas id="chart-inv-marca-docx" width={900} height={420} />
          <canvas id="chart-top-usuarios-docx" width={900} height={380} />
        </div>

        {/* Contenedor oculto PDF */}
        <div ref={previewRef} id="pdf-preview-root" style={{ position: "fixed", left: -10000, top: -10000, width: 794, background: "#FFFFFF", color: "#0F172A", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, boxShadow: "0 1px 2px rgba(0,0,0,0.05)", opacity: 0, pointerEvents: "none", zIndex: -1 }}>
          {/* Portada PDF */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
            <img src="/login/LOGO_RIDS.png" alt="RIDS" style={{ height: 44, width: "auto", objectFit: "contain" }} onError={e => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1F2937" }}>{docxTitulo}</div>
          </div>
          <div style={{ background: "linear-gradient(90deg,#111827 0%,#1F2937 100%)", color: "#FFFFFF", borderRadius: 10, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{docxSubtitulo}</div>
            <div style={{ marginTop: 8, opacity: 0.9 }}>{TEXTO_FIJO.correo} · Periodo: {periodoTexto || "—"}</div>
            <div style={{ marginTop: 10, fontWeight: 700 }}>{generarFolio(empresaNombrePreview)}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12, marginBottom: 16 }}>
            {[["Para", empresaNombrePreview], ["De", TEXTO_FIJO.de], ["Asunto", `${TEXTO_FIJO.asunto} (${periodoTexto || "—"})`], ["Fecha", new Date().toLocaleDateString("es-CL")], ["Ingeniera en conocimiento", TEXTO_FIJO.ingeniera], ["Técnicos en conocimientos", TEXTO_FIJO.tecnicos]].map(([l, v]) => (
              <div key={l} style={{ background: "#F3F4F6", borderRadius: 8, padding: 12 }}>
                <div style={{ ...labelStyle, color: "#1F2937" }}>{l}</div>
                <div style={{ ...valueStyle, color: "#111827" }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 12, fontSize: 14, lineHeight: 1.5 }}>{TEXTO_FIJO.intro}</div>

          {/* KPIs PDF */}
          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Resumen del periodo</h4>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead><tr>{["Métrica", "Valor"].map(h => <th key={h} style={cellHeader}>{h}</th>)}</tr></thead>
            <tbody>
              {dataPrev ? (<>
                <tr><td style={cellBorder}>Tickets</td><td style={cellBorder}>{dataPrev.kpis.tickets.total}</td></tr>
                <tr><td style={cellBorder}>Visitas</td><td style={cellBorder}>{dataPrev.kpis.visitas.count}</td></tr>
                <tr><td style={cellBorder}>Mantenciones remotas</td><td style={cellBorder}>{dataPrev.kpis.mantenciones.total}</td></tr>
                <tr><td style={cellBorder}>Equipos</td><td style={cellBorder}>{dataPrev.kpis.equipos.count}</td></tr>
                <tr><td style={cellBorder}>Solicitantes CRM</td><td style={cellBorder}>{(dataPrev.usuariosCRM ?? []).length}</td></tr>
              </>) : <tr><td style={cellBorder} colSpan={2}>—</td></tr>}
            </tbody>
          </table>

          {/* 🔥 Directorio CRM en PDF */}
          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Directorio de Solicitantes (CRM)</h4>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead><tr>{["Nombre", "Email"].map(h => <th key={h} style={cellHeader}>{h}</th>)}</tr></thead>
            <tbody>
              {(dataPrev?.usuariosCRM ?? []).sort((a, b) => a.usuario.localeCompare(b.usuario)).slice(0, 150).map(u => (
                <tr key={u.usuario}>
                  <td style={cellBorder}>{u.usuario}</td>
                  <td style={cellBorder}>{u.email ?? "—"}</td>
                </tr>
              ))}
              {!(dataPrev?.usuariosCRM?.length) && <tr><td style={cellBorder} colSpan={3}>— Sin registros —</td></tr>}
            </tbody>
          </table>

          {/* Tickets PDF */}
          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Tickets (detalle)</h4>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead><tr>{["Fecha", "Categoría", "Estado"].map(h => <th key={h} style={cellHeader}>{h}</th>)}</tr></thead>
            <tbody>
              {(dataPrev?.tickets?.detalle || []).slice(0, 120).map(t => (
                <tr key={t.id}><td style={cellBorder}>{toCLDateTime(t.createdAt)}</td><td style={cellBorder}>{t.type ?? "—"}</td><td style={cellBorder}>{String(t.status ?? "")}</td></tr>
              ))}
              {!dataPrev?.tickets?.detalle?.length && <tr><td style={cellBorder} colSpan={3}>— Sin registros —</td></tr>}
            </tbody>
          </table>

          {/* Mantenciones PDF */}
          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Mantenciones remotas (detalle)</h4>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead><tr>{["ID", "Inicio", "Fin", "Estado", "Técnico", "Usuario"].map(h => <th key={h} style={cellHeader}>{h}</th>)}</tr></thead>
            <tbody>
              {(dataPrev?.mantenciones?.detalle || []).slice(0, 120).map(m => (
                <tr key={m.id_mantencion}>
                  <td style={cellBorder}>{m.id_mantencion}</td>
                  <td style={cellBorder}>{toCLDateTime(m.inicio)}</td>
                  <td style={cellBorder}>{m.fin ? toCLDateTime(m.fin) : "—"}</td>
                  <td style={cellBorder}>{String(m.status ?? "").toUpperCase()}</td>
                  <td style={cellBorder}>{m.tecnico?.nombre ?? "—"}</td>
                  <td style={cellBorder}>{m.solicitante ?? "—"}</td>
                </tr>
              ))}
              {!dataPrev?.mantenciones?.detalle?.length && <tr><td style={cellBorder} colSpan={6}>— Sin registros —</td></tr>}
            </tbody>
          </table>

          {/* Recomendaciones PDF */}
          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Recomendaciones del periodo</h4>
          <div style={{ fontSize: 14 }}>{recomendaciones || "Sin recomendaciones adicionales para el periodo."}</div>
        </div>

        {/* Panel portada */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mt-6">
          <h3 className="font-bold text-slate-800 mb-6 text-xl flex items-center justify-center"><BuildOutlined className="mr-3 text-slate-600" />Portada y recomendaciones</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-slate-600 mb-2">Título</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500" value={docxTitulo} onChange={e => setDocxTitulo(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-2">Subtítulo</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500" value={docxSubtitulo} onChange={e => setDocxSubtitulo(e.target.value)} />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm text-slate-600 mb-2">Recomendaciones</label>
            <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500" rows={4} value={recomendaciones} onChange={e => setRecomendaciones(e.target.value)} placeholder="Agrega recomendaciones del periodo..." />
          </div>
        </motion.div>
      </main>

      {/* Modal PDF */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/60" onClick={closePdfModal} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <div className="font-semibold text-slate-800 flex items-center gap-2"><EyeOutlined />Vista previa PDF</div>
                <div className="flex items-center gap-2">
                  <button onClick={downloadPdf} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white"><DownloadOutlined /> Descargar</button>
                  <button onClick={printPdf} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"><PrinterOutlined /> Imprimir</button>
                  <button onClick={closePdfModal} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800"><CloseOutlined /></button>
                </div>
              </div>
              <div className="h-[80vh] bg-slate-50">
                {pdfUrl ? <iframe ref={iframeRef} src={pdfUrl} className="w-full h-full" title="Vista previa PDF" /> : <div className="h-full flex items-center justify-center text-slate-500"><LoadingOutlined className="mr-2 animate-spin" /> Cargando PDF…</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {exportStatus.exporting && (
        <div className="fixed inset-0 z-[90] pointer-events-none">
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow border border-slate-200 text-slate-700 flex items-center gap-2">
              <LoadingOutlined className="animate-spin" />Generando…
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportesPage;