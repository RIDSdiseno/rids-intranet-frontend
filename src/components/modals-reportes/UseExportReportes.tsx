// hooks/useExportReportes.ts
import { useState } from "react";
import * as XLSX from "xlsx-js-style";
import {
  AlignmentType, BorderStyle, Document, Footer, Header as DocxHeader,
  HeadingLevel, Packer, Paragraph, SectionType, Table, TableCell,
  TableRow, TextRun, WidthType, ImageRun, PageNumber, VerticalAlign,
} from "docx";
import type { ITableBordersOptions } from "docx";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import type {
  ExportStatus, ReporteGeneralData, VisitaRow, EquipoRow, SolicitanteRow, TicketRow,
} from "../modals-reportes/typesReportes";
import {
  TEXTO_FIJO, CHART_CONFIG,
  contarMantenimientos, contarExtras, contarTiposVisita,
  contarMantenimientosPorFecha, contarMantenimientosPorUsuario,
  calcularTendenciasMensuales, calcularDistribucionServicios,
  obtenerTopUsuariosGeneral,
  generateBarChart, generatePieChart, generateLineChart,
  dataUrlToUint8Array, generarFolio, obtenerTopSolicitantesTickets
} from "./UtilsReportes";

import type {
  TicketDashboardMonthlyRow,
} from "./typesReportes";

import { buildReporteExportData } from "./buildReporteExportData";

import { http } from "../../service/http";
import { buildAndDownloadReporteIABetaDocx } from "./buildReporteIABetaDocx";

// ─── XLSX helpers ─────────────────────────────────────────────────────────

const applyBasicStyles = (ws: XLSX.WorkSheet): XLSX.WorkSheet => {
  const ref = ws["!ref"];
  if (!ref) return ws;

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
    const cell = ws[addr] as XLSX.CellObject | undefined;
    if (cell) cell.s = { ...(cell.s || {}), ...headerStyle };
  }
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr] as XLSX.CellObject | undefined;
      if (cell) cell.s = { ...(cell.s || {}), border: cellBorder };
    }
  }
  if (!ws["!cols"]) {
    ws["!cols"] = Array(range.e.c - range.s.c + 1).fill({ wch: 20 });
  }
  return ws;
};

// ─── DOCX theme ───────────────────────────────────────────────────────────

const THEME = {
  primary: "1F2937", primaryLight: "F3F4F6",
  text: "0F172A", textMuted: "475569",
  border: "E5E7EB", zebra: "F9FAFB", accent: "2563EB",
};

const noBorders: ITableBordersOptions = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

// Configuración de visualización de tablas del doc word
const H1 = (t: string) =>
  new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 260, after: 140, line: 360 }, children: [new TextRun({ text: t, bold: true })] });

const H2 = (t: string) =>
  new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100, line: 340 }, children: [new TextRun({ text: t, bold: true })] });

const Body = (t: string) =>
  new Paragraph({ spacing: { after: 140, line: 320 }, children: [new TextRun({ text: t, color: THEME.text })] });

const Note = (t: string) =>
  new Paragraph({ spacing: { before: 40, after: 160 }, children: [new TextRun({ text: t, italics: true, color: THEME.textMuted })] });

const Divider = () =>
  new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: THEME.border } }, spacing: { after: 220 } });

// Función para que los datos en la tabla se vean hacia la derecha
const tableProRight = (
  caption: string,
  headers: string[],
  rows: Array<Record<string, string | number>>,
  columnWidths?: number[]
): Table[] => {
  const colW = columnWidths || Array(headers.length).fill(100 / headers.length);

  const headerCells = headers.map((h, ci) =>
    new TableCell({
      shading: { fill: THEME.primary },
      verticalAlign: VerticalAlign.CENTER,
      width: { size: colW[ci], type: WidthType.PERCENTAGE },
      margins: {
        top: 80,
        bottom: 80,
        left: 120,
        right: 120,
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20 })],
        }),
      ],
    })
  );

  const bodyRows = rows.map((r, idx) => {
    const bg = idx % 2 === 0 ? THEME.zebra : "FFFFFF";
    return new TableRow({
      children: headers.map((k, ci) =>
        new TableCell({
          shading: { fill: bg },
          verticalAlign: VerticalAlign.CENTER,
          width: { size: colW[ci], type: WidthType.PERCENTAGE },
          margins: {
            top: 80,
            bottom: 80,
            left: 120,
            right: 120,
          },
          children: [
            new Paragraph({
              alignment: ci === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT,
              children: [new TextRun({ text: String(r[k] ?? ""), color: THEME.text, size: 18 })],
            }),
          ],
        })
      ),
    });
  });

  return [
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
                  spacing: { before: 80, after: 40 },
                  children: [new TextRun({ text: caption, italics: true, color: THEME.textMuted, size: 18 })],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: headerCells }), ...bodyRows],
    }),
  ];
};

// Función de visualización de contenido en la tabla
const tablePro = (
  caption: string,
  headers: string[],
  rows: Array<Record<string, string | number>>,
  columnWidths?: number[]
): Table[] => {
  const colW = columnWidths || Array(headers.length).fill(100 / headers.length);
  const headerCells = headers.map((h, ci) =>
    new TableCell({
      shading: { fill: THEME.primary },
      verticalAlign: VerticalAlign.CENTER,
      width: { size: colW[ci], type: WidthType.PERCENTAGE },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20 })] })],
    })
  );
  const bodyRows = rows.map((r, idx) => {
    const bg = idx % 2 === 0 ? THEME.zebra : "FFFFFF";
    return new TableRow({
      children: headers.map((k, ci) => {
        const alignment = typeof r[k] === "number" ? AlignmentType.RIGHT : k.toLowerCase().includes("fecha") ? AlignmentType.CENTER : AlignmentType.LEFT;
        return new TableCell({
          shading: { fill: bg },
          verticalAlign: VerticalAlign.CENTER,
          width: { size: colW[ci], type: WidthType.PERCENTAGE },
          children: [new Paragraph({ alignment, children: [new TextRun({ text: String(r[k] ?? ""), color: THEME.text, size: 18 })] })],
        });
      }),
    });
  });

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [new TableRow({ children: [new TableCell({ borders: noBorders, children: [new Paragraph({ spacing: { before: 80, after: 40 }, children: [new TextRun({ text: caption, italics: true, color: THEME.textMuted, size: 18 })] })] })] })],
    }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: headerCells }), ...bodyRows] }),
  ];
};

const fetchImageBytes = async (path: string): Promise<Uint8Array | null> => {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
};

const buildPortada = (logoBytes: Uint8Array | null, titulo: string, subtitulo: string, empresa: string, periodo: string) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: noBorders,
          width: { size: 65, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({ spacing: { after: 160 }, children: [logoBytes ? new ImageRun({ data: logoBytes, type: "png", transformation: { width: 200, height: 60 } }) : new TextRun({ text: "Asesorías RIDS Ltda.", bold: true, size: 36 })] }),
            new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: titulo, bold: true, size: 58, color: THEME.primary })] }),
            new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: subtitulo, size: 28, color: THEME.textMuted })] }),
            new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: THEME.border } }, spacing: { before: 40, after: 120 }, children: [new TextRun({ text: `${empresa} · ${periodo}`, size: 26, color: THEME.text })] }),
          ],
        }),
        new TableCell({
          borders: noBorders,
          width: { size: 35, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 90, after: 0 }, children: [new TextRun({ text: generarFolio(empresa), color: THEME.accent, bold: true })] }),
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: TEXTO_FIJO.correo, color: THEME.textMuted })] }),
          ],
        }),
      ],
    })],
  });

const buildHeader = (empresa: string) =>
  new DocxHeader({ children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: `Informe Operativo · ${empresa}`, color: THEME.textMuted })] })] });

const buildFooter = () =>
  new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Página " }), new TextRun({ children: [PageNumber.CURRENT] }), new TextRun({ text: " de " }), new TextRun({ children: [PageNumber.TOTAL_PAGES] }), new TextRun({ text: "  ·  soporte@rids.cl" })] })] });

const ticketStatusLabel = (status?: string | null) => {
  switch ((status || "").toUpperCase()) {
    case "NEW":
      return "Nuevo";
    case "OPEN":
      return "Abierto";
    case "PENDING":
      return "Pendiente";
    case "ON_HOLD":
      return "En espera";
    case "RESOLVED":
      return "Resuelto";
    case "CLOSED":
      return "Cerrado";
    default:
      return status ? String(status) : "—";
  }
};

// ─── IA REPORT PARSER ─────────────────────────────────────────────

function parseInformeIA(text: string) {
  const sections: { title: string; lines: string[] }[] = [];
  let current: { title: string; lines: string[] } | null = null;

  text.split("\n").forEach((line) => {
    const clean = line.trim();
    if (!clean) return;

    const upper = clean.toUpperCase();

    // ✅ Detecta títulos numerados ("1. Resumen Ejecutivo") Y palabras clave
    const isNumberedTitle = /^\d+\.\s+\S/.test(clean);
    const isKeywordTitle =
      upper.includes("RESUMEN EJECUTIVO") ||
      upper.includes("ANÁLISIS") ||
      upper.includes("ANÁLISIS OPERATIVO") ||
      upper.includes("HALLAZGOS") ||
      upper.includes("RIESGOS") ||
      upper.includes("RECOMENDACIONES") ||
      upper.includes("PLAN DE ACCIÓN") ||
      upper.includes("KPIS") ||
      upper.includes("ESTADO DEL SERVICIO") ||
      upper.includes("SOPORTE TÉCNICO");

    if (isNumberedTitle || isKeywordTitle) {
      // ✅ Limpia el número si viene numerado ("1. Resumen" → "Resumen")
      const cleanTitle = clean.replace(/^\d+\.\s+/, "");
      current = { title: cleanTitle, lines: [] };
      sections.push(current);
      return;
    }

    if (current) {
      current.lines.push(clean);
    }
  });

  return sections;
}

// ─── Main hook ────────────────────────────────────────────────────────────

interface UseExportProps {
  empresaFiltro: string;
  selectedYear: string;
  selectedMonth: string;
  periodoTexto: string;
  empresaNombre: string;
  docxTitulo: string;
  docxSubtitulo: string;
  recomendaciones: string;
  previewRef: React.RefObject<HTMLDivElement | null>;
  obtenerDatosReporteGeneral: (
    empresaFiltro: string,
    selectedYear: string,
    selectedMonth: string
  ) => Promise<ReporteGeneralData>;
  onDataLoaded: (data: ReporteGeneralData) => void;
}

export const useExportReportes = ({
  empresaFiltro,
  selectedYear,
  selectedMonth,
  periodoTexto,
  empresaNombre,
  docxTitulo,
  docxSubtitulo,
  recomendaciones,
  previewRef,
  obtenerDatosReporteGeneral,
  onDataLoaded,
}: UseExportProps) => {
  const [exportStatus, setExportStatus] = useState<ExportStatus>({
    exporting: false,
    error: null,
  });

  // word IA
  const exportDOCXIABeta = async () => {
    try {
      setExportStatus({ exporting: true, error: null });

      const dataBase = await obtenerDatosReporteGeneral(
        empresaFiltro,
        selectedYear,
        selectedMonth
      );
      onDataLoaded(dataBase);

      const { data } = await http.get(
        `/ia-reportes/word-beta/${empresaFiltro}/${selectedYear}/${selectedMonth}`
      );

      const iaPayload = data.data;
      const logoBytes = await fetchImageBytes("/login/rids_logo.png");
      const headerLogoBytes = await fetchImageBytes("/login/LOGO_RIDS.png");

      const ticketsPorCategoriaMap: Record<string, number> = {};
      for (const t of dataBase.tickets || []) {
        const key = (t.type || "Sin categoría").trim();
        ticketsPorCategoriaMap[key] = (ticketsPorCategoriaMap[key] || 0) + 1;
      }

      const ticketsPorCategoria = Object.entries(ticketsPorCategoriaMap).map(
        ([label, value]) => ({ label, value })
      );

      const topUsuariosGeneral = obtenerTopUsuariosGeneral(
        dataBase.visitas || [],
        dataBase.tickets || []
      ).map((x: any) => ({
        label: String(x.Usuario),
        value: Number(x.Solicitudes),
      }));

      const visitasPorTecnicoMap: Record<string, number> = {};
      for (const v of dataBase.visitas || []) {
        const key = v.tecnico?.nombre?.trim() || "Sin técnico";
        visitasPorTecnicoMap[key] = (visitasPorTecnicoMap[key] || 0) + 1;
      }
      const visitasPorTecnico = Object.entries(visitasPorTecnicoMap).map(
        ([label, value]) => ({ label, value })
      );

      const visitasPorTipoRows = contarTiposVisita(dataBase.visitas || []).map((x: any) => ({
        label: String(x.Tipo),
        value: Number(x.Cantidad),
      }));

      const mantencionesPorStatusMap: Record<string, number> = {};
      for (const m of dataBase.mantencionesRemotas || []) {
        const key = (m.status || "Sin estado").trim();
        mantencionesPorStatusMap[key] = (mantencionesPorStatusMap[key] || 0) + 1;
      }
      const mantencionesPorStatus = Object.entries(mantencionesPorStatusMap).map(
        ([label, value]) => ({ label, value })
      );

      const mantencionesPorTecnicoMap: Record<string, number> = {};
      for (const m of dataBase.mantencionesRemotas || []) {
        const key = m.tecnico?.nombre?.trim() || "Sin técnico";
        mantencionesPorTecnicoMap[key] = (mantencionesPorTecnicoMap[key] || 0) + 1;
      }
      const mantencionesPorTecnico = Object.entries(mantencionesPorTecnicoMap).map(
        ([label, value]) => ({ label, value })
      );

      const inventarioPorMarcaMap: Record<string, number> = {};
      for (const eq of dataBase.equipos || []) {
        const key = (eq.marca || "Sin marca").trim();
        inventarioPorMarcaMap[key] = (inventarioPorMarcaMap[key] || 0) + 1;
      }
      const inventarioPorMarca = Object.entries(inventarioPorMarcaMap).map(
        ([label, value]) => ({ label, value })
      );

      const mantencionesPorFechaRows = contarMantenimientosPorFecha(
        dataBase.visitas || []
      ).map((x: any) => ({
        label: String(x.Fecha),
        value: Number(x.Cantidad),
      }));

      const actividadesMantenimientoRows = contarMantenimientos(
        dataBase.visitas || []
      ).map((x: any) => ({
        label: String(x.Ítem),
        value: Number(x.Cantidad),
      }));

      const distribucionServiciosRows = (() => {
        const ds = calcularDistribucionServicios(dataBase.visitas || []);
        return (ds?.labels || []).map((label: string, index: number) => ({
          label: String(label),
          value: Number(ds?.data?.[index] || 0),
        }));
      })();

      const topSolicitantesTickets = obtenerTopSolicitantesTickets(dataBase.tickets || []).map((x: any) => ({
        label: String(x.Solicitante),
        value: Number(x.Tickets),
      }));

      const datasetMap: Record<string, { labels: string[]; values: number[] }> = {
        mantenciones_por_fecha: {
          labels: mantencionesPorFechaRows.map((x) => x.label),
          values: mantencionesPorFechaRows.map((x) => x.value),
        },
        distribucion_servicios: {
          labels: distribucionServiciosRows.map((x) => x.label),
          values: distribucionServiciosRows.map((x) => x.value),
        },
        solicitudes_programadas_vs_adicionales: {
          labels: visitasPorTipoRows.map((x) => x.label),
          values: visitasPorTipoRows.map((x) => x.value),
        },
        actividades_mantenimiento: {
          labels: actividadesMantenimientoRows.map((x) => x.label),
          values: actividadesMantenimientoRows.map((x) => x.value),
        },
        inventario_por_marca: {
          labels: inventarioPorMarca.map((x) => x.label),
          values: inventarioPorMarca.map((x) => x.value),
        },
        tickets_por_categoria: {
          labels: ticketsPorCategoria.map((x) => x.label),
          values: ticketsPorCategoria.map((x) => x.value),
        },
        tickets_top_usuarios: {
          labels: topUsuariosGeneral.map((x) => x.label),
          values: topUsuariosGeneral.map((x) => x.value),
        },
        visitas_por_tecnico: {
          labels: visitasPorTecnico.map((x) => x.label),
          values: visitasPorTecnico.map((x) => x.value),
        },
        visitas_por_tipo: {
          labels: visitasPorTipoRows.map((x) => x.label),
          values: visitasPorTipoRows.map((x) => x.value),
        },
        mantenciones_por_status: {
          labels: mantencionesPorStatus.map((x) => x.label),
          values: mantencionesPorStatus.map((x) => x.value),
        },
        mantenciones_por_tecnico: {
          labels: mantencionesPorTecnico.map((x) => x.label),
          values: mantencionesPorTecnico.map((x) => x.value),
        },
        tickets_top_solicitantes: {
          labels: topSolicitantesTickets.map((x) => x.label),
          values: topSolicitantesTickets.map((x) => x.value),
        },
      };

      const chartIdMap: Record<string, string> = {
        mantenciones_por_fecha: "chart-wordbeta-mant-fecha",
        distribucion_servicios: "chart-wordbeta-distribucion-servicios",
        solicitudes_programadas_vs_adicionales:
          "chart-wordbeta-solicitudes-programadas",
        actividades_mantenimiento: "chart-wordbeta-actividades-mantenimiento",
        inventario_por_marca: "chart-wordbeta-inventario-marca",
        tickets_por_categoria: "chart-wordbeta-tickets-categoria",
        tickets_top_usuarios: "chart-wordbeta-top-usuarios",
        tickets_top_solicitantes: "chart-wordbeta-top-solicitantes-tickets",
        visitas_por_tecnico: "chart-wordbeta-visitas-tecnico",
        visitas_por_tipo: "chart-wordbeta-visitas-tipo",
        mantenciones_por_status: "chart-wordbeta-mant-status",
        mantenciones_por_tecnico: "chart-wordbeta-mant-tecnico",
      };

      const chartColorMap: Record<string, string> = {
        mantenciones_por_fecha: CHART_CONFIG.colors.primary,
        distribucion_servicios: CHART_CONFIG.colors.secondary,
        solicitudes_programadas_vs_adicionales: CHART_CONFIG.colors.purple,
        actividades_mantenimiento: CHART_CONFIG.colors.accent,
        inventario_por_marca: CHART_CONFIG.colors.danger,
        tickets_por_categoria: CHART_CONFIG.colors.teal,
        tickets_top_usuarios: CHART_CONFIG.colors.emerald,
        tickets_top_solicitantes: CHART_CONFIG.colors.rose,
        visitas_por_tecnico: CHART_CONFIG.colors.cyan,
        visitas_por_tipo: CHART_CONFIG.colors.pink,
        mantenciones_por_status: CHART_CONFIG.colors.warning,
        mantenciones_por_tecnico: CHART_CONFIG.colors.teal,
      };

      const graficosOperacionalesFijos = [
        {
          tipo: "bar",
          titulo: "Cantidad de mantenciones por fecha",
          dataset_key: "mantenciones_por_fecha",
          lectura:
            "Permite observar la distribución temporal de mantenciones realizadas durante el periodo y detectar jornadas de mayor actividad.",
        },
        {
          tipo: "pie",
          titulo: "Distribución de Servicios",
          dataset_key: "distribucion_servicios",
          lectura:
            "Resume visualmente el peso relativo de cada tipo de servicio ejecutado durante el periodo.",
        },
        {
          tipo: "pie",
          titulo: "Solicitudes programadas vs adicionales",
          dataset_key: "solicitudes_programadas_vs_adicionales",
          lectura:
            "Permite distinguir la proporción entre trabajo planificado y requerimientos adicionales atendidos en terreno.",
        },
        {
          tipo: "bar",
          titulo: "Actividades de mantenimiento",
          dataset_key: "actividades_mantenimiento",
          lectura:
            "Muestra las principales actividades ejecutadas por el equipo técnico dentro del periodo informado.",
        },
        {
          tipo: "bar",
          titulo: "Inventario de equipos por marca",
          dataset_key: "inventario_por_marca",
          lectura:
            "Entrega visibilidad sobre la composición del parque tecnológico por fabricante.",
        },
        {
          tipo: "bar",
          titulo: "Top 5 solicitantes con más tickets",
          dataset_key: "tickets_top_solicitantes",
          lectura:
            "Permite identificar los solicitantes que generaron mayor volumen de tickets durante el periodo.",
        },
      ];

      const graficosCombinados = [
        ...graficosOperacionalesFijos,
        ...(iaPayload.graficos_sugeridos || []),
      ].filter((grafico, index, arr) => {
        const key = grafico?.dataset_key || `idx-${index}`;
        return arr.findIndex((x) => (x?.dataset_key || `idx-${index}`) === key) === index;
      });

      const chartImages = [];


      for (const grafico of graficosCombinados) {
        const datasetKey = grafico.dataset_key;
        const ds = datasetMap[datasetKey];
        const chartId = chartIdMap[datasetKey];

        if (!datasetKey || !ds || !chartId || !ds.labels.length || !ds.values.length) {
          chartImages.push({
            ...grafico,
            imageBytes: null,
          });
          continue;
        }

        let dataUrl: string | null = null;
        const tipo = String(grafico.tipo || "").toLowerCase();

        if (tipo === "pie" || tipo === "doughnut") {
          dataUrl = await generatePieChart(
            chartId,
            ds.labels,
            ds.values,
            grafico.titulo || "Gráfico"
          );
        } else if (tipo === "line") {
          const chartColor = chartColorMap[datasetKey] || CHART_CONFIG.colors.primary;
          dataUrl = await generateLineChart(
            chartId,
            ds.labels,
            [
              {
                label: grafico.titulo || "Serie",
                data: ds.values,
                color: chartColor,
              },
            ],
            grafico.titulo || "Gráfico"
          );
        } else {
          const chartColor = chartColorMap[datasetKey] || CHART_CONFIG.colors.primary;
          dataUrl = await generateBarChart(
            chartId,
            ds.labels,
            ds.values,
            grafico.titulo || "Gráfico",
            chartColor
          );
        }

        chartImages.push({
          ...grafico,
          imageBytes: dataUrl ? dataUrlToUint8Array(dataUrl) : null,
        });
      }

      const extras = contarExtras(dataBase.visitas || []);

      await buildAndDownloadReporteIABetaDocx({
        payload: { ...iaPayload, graficos_sugeridos: graficosCombinados },
        empresaNombre,
        periodoTexto,
        chartImages,
        mantencionesRemotas: dataBase.mantencionesRemotas || [],
        ticketsDetalle: dataBase.tickets || [],
        visitasDetalle: dataBase.visitas || [],
        extrasTotales: extras.totales || [],
        extrasDetalle: extras.detalles || [],
        solicitantesDetalle: dataBase.solicitantes || [],
        equiposDetalle: dataBase.equipos || [],
        logoBytes,
        headerLogoBytes,
      });

      setExportStatus({ exporting: false, error: null });
    } catch (e) {
      console.error(e);
      setExportStatus({
        exporting: false,
        error: "No se pudo generar el Word IA (Beta).",
      });
    }
  };

  const formatMesTexto = (mes: string) => {
    if (!mes) return "el período";
    const [year, month] = mes.split("-");
    const monthIndex = Number(month) - 1;

    const meses = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ];

    if (monthIndex < 0 || monthIndex > 11 || !year) return mes;
    return `${meses[monthIndex]} de ${year}`;
  };

  const buildTicketMonthlySummary = (row: TicketDashboardMonthlyRow) => {
    const mesTexto = formatMesTexto(row.mes);
    const tickets = Number(row.total_tickets || 0);
    const cerrados = Number(row.tickets_cerrados || 0);
    const horas = Number(row.horas_cap8h || 0);
    const pct8h = Number(row.pct_resueltos_8h || 0);
    const complejos = Number(row.tickets_complejos || 0);
    const mediana = Number(row.mediana_minutos || 0);

    const medianaTexto = mediana > 0 ? `${mediana} minutos` : "sin mediana disponible";
    const complejosTexto =
      complejos === 0
        ? "sin casos clasificados como complejos"
        : complejos === 1
          ? "1 caso clasificado como complejo"
          : `${complejos} casos clasificados como complejos`;

    return `En ${mesTexto} se registraron ${tickets} tickets, de los cuales ${cerrados} fueron cerrados durante el período. El tiempo total estimado de atención fue de ${horas.toFixed(1)} horas, y el ${pct8h.toFixed(1)}% se resolvió en 8 horas o menos. La media de resolución fue de ${medianaTexto}, con ${complejosTexto}.`;
  };

  const formatHorasMinutos = (minutos: number) => {
    const total = Number(minutos || 0);
    const horas = Math.floor(total / 60);
    const mins = total % 60;

    if (horas <= 0) return `${mins}m`;
    if (mins === 0) return `${horas}h`;
    return `${horas}h ${mins}m`;
  };

  const buildTeamViewerMonthlySummary = (row: {
    mes: string;
    sesiones_mes: number;
    minutos_mes: number;
  }) => {
    const mesTexto = formatMesTexto(row.mes);
    const sesiones = Number(row.sesiones_mes || 0);
    const minutos = Number(row.minutos_mes || 0);
    const tiempoTexto = formatHorasMinutos(minutos);

    return `En ${mesTexto} se realizaron ${sesiones} sesiones de mantención remota, con un tiempo total invertido de ${minutos} minutos, equivalente a ${tiempoTexto}.`;
  };

  const buildTeamViewerGeneralSummary = (
    summary: { totalSesiones: number; totalMinutos: number } | null,
    firstRow?: { mes: string; sesiones_mes: number; minutos_mes: number }
  ) => {
    if (firstRow) {
      return buildTeamViewerMonthlySummary(firstRow);
    }

    if (!summary) {
      return "No hay resumen disponible para mantenciones remotas en este período.";
    }

    return `Durante el período seleccionado se registraron ${summary.totalSesiones} sesiones de mantención remota, con un total de ${summary.totalMinutos} minutos invertidos, equivalentes a ${formatHorasMinutos(summary.totalMinutos)}.`;
  };

  const getDuracionMinutos = (inicio?: string | null, fin?: string | null) => {
    if (!inicio || !fin) return 0;

    const i = new Date(inicio);
    const f = new Date(fin);

    if (Number.isNaN(i.getTime()) || Number.isNaN(f.getTime())) return 0;

    const diff = Math.round((f.getTime() - i.getTime()) / 60000);
    return diff > 0 ? diff : 0;
  };

  // ─── DOCX ────────────────────────────────────────────────────────────

  const exportDOCX = async () => {
    try {
      setExportStatus({ exporting: true, error: null });
      const data = await obtenerDatosReporteGeneral(empresaFiltro, selectedYear, selectedMonth);
      onDataLoaded(data);

      const sMap = new Map<number, string>();
      for (const s of data.solicitantes)
        if (typeof s.id_solicitante === "number") sMap.set(s.id_solicitante, s.nombre ?? "");

      const ticketsRows = data.tickets.map((t) => ({
        ID: t.ticket_id,
        Asunto: t.subject ?? "",
        Estado: ticketStatusLabel(t.status),
        "Fecha creación": t.createdAt
          ? new Date(t.createdAt).toLocaleString("es-CL")
          : t.fecha
            ? new Date(t.fecha).toLocaleString("es-CL")
            : "—",
        "Fecha resolución": t.resolvedAt
          ? new Date(t.resolvedAt).toLocaleString("es-CL")
          : "—",
        "Técnico asignado": t.assigneeNombre ?? "—",
        "Correo solicitante": t.solicitante_email ?? "—",
      }));

      const topSolicitantesTickets = obtenerTopSolicitantesTickets(data.tickets);

      const chartTopSolicitantesTicketsUrl =
        topSolicitantesTickets.length > 0
          ? await generateBarChart(
            "chart-topsolicitantes-tickets-docx",
            topSolicitantesTickets.map((r) => r.Solicitante),
            topSolicitantesTickets.map((r) => Number(r.Tickets)),
            "Top 5 solicitantes con más tickets",
            CHART_CONFIG.colors.rose
          )
          : null;

      const exportData = buildReporteExportData({
        data,
        periodoTexto,
        empresaNombre,
      });

      const {
        formatHorasMinutos,
        dashboardMonthlySummary,
        dashboardMonthlyRows,
        teamViewerMonthlySummaryText,
        tvBreakdownRows,
        totalMinutosVisitas,
        totalJornadasVisitas,
        resumenVisitasTecnicas,
        totalHorasTickets,
        totalMinutosRemotas,
        totalHorasSoporte,
        totalSoporteResumen,
        tvAverages,
        tvBreakdown,
        tvSummary
      } = exportData;

      const dashboardMonthly = data.ticketDashboardMonthly ?? [];

      const monthlyLabels = dashboardMonthly.map((r) => r.mes);
      const monthlyTickets = dashboardMonthly.map((r) => r.total_tickets);
      const monthlyHoras = dashboardMonthly.map((r) => r.horas_cap8h);

      const chartTicketsMensualUrl =
        monthlyLabels.length > 0
          ? await generateBarChart(
            "chart-dashboard-tickets-mes-docx",
            monthlyLabels,
            monthlyTickets,
            "Tickets por mes",
            CHART_CONFIG.colors.teal
          )
          : null;

      const chartHorasMensualUrl =
        monthlyLabels.length > 0
          ? await generateLineChart(
            "chart-dashboard-horas-mes-docx",
            monthlyLabels,
            [
              {
                label: "Horas est. (cap 8h)",
                data: monthlyHoras,
                color: CHART_CONFIG.colors.orange,
              },
            ],
            "Horas estimadas por mes"
          )
          : null;


      const visitasAgrupadas = Array.from(
        new Map(
          (data.visitas ?? []).map((v) => {
            const key = [
              v.tecnico?.nombre?.trim() || "sin-tecnico",
              v.inicio || "sin-inicio",
              v.fin || "sin-fin",
            ].join("|");

            return [key, v];
          })
        ).values()
      );


      const totalHorasRemotas = totalMinutosRemotas / 60;
      const totalHorasVisitas = totalMinutosVisitas / 60;

      const tvAverageRows = tvAverages.map((r) => ({
        Empresa: r.empresa,
        "Prom. sesiones/mes": Number(r.promedio_sesiones_mes || 0),
        "Prom. minutos/mes": Number(r.promedio_minutos_mes || 0),
        "Equivalente": `${Math.floor(Number(r.promedio_minutos_mes || 0) / 60)}h ${Math.round(Number(r.promedio_minutos_mes || 0) % 60)}m`,
      }));

      const tvMonthlyLabels = tvBreakdown.map((r) => r.mes);
      const tvMonthlyMinutes = tvBreakdown.map((r) => Number(r.minutos_mes || 0));

      const chartTeamViewerMensualUrl =
        tvMonthlyLabels.length > 0
          ? await generateBarChart(
            "chart-teamviewer-minutos-mes-docx",
            tvMonthlyLabels,
            tvMonthlyMinutes,
            "Minutos por mes",
            CHART_CONFIG.colors.primary
          )
          : null;

      const visitasRows = data.visitas.map((v) => {
        let fechaVisita = "—";
        if (v.inicio) {
          try {
            const d = new Date(v.inicio);
            if (!isNaN(d.getTime())) fechaVisita = d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
          } catch { /* noop */ }
        }
        let horario = "—";
        if (v.inicio && v.fin) {
          try {
            const i = new Date(v.inicio), f = new Date(v.fin);
            if (!isNaN(i.getTime()) && !isNaN(f.getTime()))
              horario = `${i.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })} - ${f.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`;
          } catch { /* noop */ }
        }
        const truncate = (s: string, n: number) => s.length > n ? s.substring(0, n - 3) + "..." : s;
        return {
          Técnico: truncate(v.tecnico?.nombre ?? "—", 20),
          Fecha: fechaVisita, Horario: horario,
          Usuario: truncate(v.solicitante ?? v.solicitanteRef?.nombre ?? "—", 25),
          Estado: truncate((v.status ?? "").toUpperCase() || "—", 15),
        };
      });

      const correosRows = data.solicitantes.map((s, i) => ({ "#": i + 1, Nombre: s.nombre ?? "", Correo: s.email ?? "" }));
      const inventarioRows = data.equipos.map((e) => ({
        Serial: e.serial ?? "", Marca: e.marca ?? "", Modelo: e.modelo ?? "",
        RAM: e.ram ?? "", Disco: e.disco ?? "", Propiedad: e.propiedad ?? "",
        Solicitante: e.idSolicitante != null ? sMap.get(e.idSolicitante) ?? "" : "",
      }));

      const extras = contarExtras(data.visitas);
      const informeIASections = parseInformeIA(recomendaciones || "");
      const logoBytes = await fetchImageBytes("/login/rids_logo.png");

      const kpis = [
        { label: "Tickets del periodo", value: data.tickets.length },
        { label: "Visitas técnicas", value: data.visitas.length },
        { label: "Equipos registrados", value: data.equipos.length },
        { label: "Usuarios atendidos", value: data.solicitantes.length },
      ];

      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise<void>((r) => setTimeout(r, 50));

      const actividadesMantenimiento = contarMantenimientos(data.visitas);
      const topUsuariosRows = obtenerTopUsuariosGeneral(data.visitas, data.tickets);
      const marcasConteo: Record<string, number> = {};
      for (const eq of data.equipos) {
        const marca = eq.marca?.trim() || "Sin marca";
        marcasConteo[marca] = (marcasConteo[marca] || 0) + 1;
      }
      const marcasLabels = Object.keys(marcasConteo);
      const marcasValues = marcasLabels.map((m) => marcasConteo[m]);
      const mantPorFecha = contarMantenimientosPorFecha(data.visitas);
      const tiposVisita = contarTiposVisita(data.visitas);
      const mantPorUsuarioTop = contarMantenimientosPorUsuario(data.visitas).slice(0, 30);
      const tendenciasMensuales = calcularTendenciasMensuales(data.visitas, data.tickets);
      const distribucionServicios = calcularDistribucionServicios(data.visitas);

      // Generar gráficos
      const [
        chartMantFechaUrl, chartSolicitudesPieUrl, chartMantenimientosUrl,
        chartTopUsuariosUrl, chartEquiposMarcaUrl, chartMantUsuarioUrl,
        chartTendenciasUrl, chartDistribucionUrl,
      ] = await Promise.all([
        mantPorFecha.length > 0 ? generateBarChart("chart-mantxfecha-docx", mantPorFecha.map(r => r.Fecha), mantPorFecha.map(r => r.Cantidad), "Cantidad de mantenciones por fecha", CHART_CONFIG.colors.primary) : null,
        tiposVisita.length > 0 ? generatePieChart("chart-solicitudes-pie-docx", tiposVisita.map(r => r.Tipo), tiposVisita.map(r => r.Cantidad), "Solicitudes programadas vs adicionales") : null,
        actividadesMantenimiento.length > 0 ? generateBarChart("chart-mantenimientos-docx", actividadesMantenimiento.map(r => r.Ítem), actividadesMantenimiento.map(r => r.Cantidad), "Actividades de mantenimiento", CHART_CONFIG.colors.secondary) : null,
        topUsuariosRows.length > 0 ? generateBarChart("chart-topusuarios-docx", topUsuariosRows.map(r => r.Usuario as string), topUsuariosRows.map(r => Number(r.Solicitudes)), "Top 5 usuarios con más solicitudes", CHART_CONFIG.colors.accent) : null,
        marcasLabels.length > 0 ? generateBarChart("chart-equiposmarca-docx", marcasLabels, marcasValues, "Equipos por marca", CHART_CONFIG.colors.purple) : null,
        mantPorUsuarioTop.length > 0 ? generateBarChart("chart-mantxusuario-docx", mantPorUsuarioTop.map(r => r.Usuario), mantPorUsuarioTop.map(r => r.Cantidad), "Cantidad de mantenciones por usuario", CHART_CONFIG.colors.teal) : null,
        tendenciasMensuales.labels.length > 0 ? generateLineChart("chart-tendencias-docx", tendenciasMensuales.labels, tendenciasMensuales.datasets, "Tendencias Mensuales") : null,
        distribucionServicios.labels.length > 0 ? generatePieChart("chart-distribucion-docx", distribucionServicios.labels, distribucionServicios.data, "Distribución de Servicios") : null,
      ]);

      const toBytes = (url: string | null) => url ? dataUrlToUint8Array(url) : null;
      const imgParagraph = (bytes: Uint8Array, w = 600, h = 320) =>
        new Paragraph({ children: [new ImageRun({ data: bytes, type: "png", transformation: { width: w, height: h } })] });

      const docChildren: (Paragraph | Table)[] = [
        buildPortada(logoBytes, docxTitulo, docxSubtitulo, empresaNombre, periodoTexto || TEXTO_FIJO.fecha),
        Divider(),
        H1("Resumen Ejecutivo"),
        Body("Durante el periodo indicado se gestionaron las incidencias y solicitudes de soporte conforme a los acuerdos de nivel de servicio (SLA)."),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({ children: kpis.map(k => new TableCell({ shading: { fill: THEME.primaryLight }, children: [new Paragraph({ children: [new TextRun({ text: String(k.value), bold: true, size: 36, color: THEME.primary })] }), new Paragraph({ children: [new TextRun({ text: k.label, size: 20, color: THEME.textMuted })] })] })) })],
        }),
        Note("Los KPIs consideran únicamente el periodo seleccionado."),
        H1("Contexto y Alcance"),
        H2("Antecedentes"), Body(TEXTO_FIJO.antecedentes),
        H2("Objetivos"), Body(TEXTO_FIJO.objetivos),
        H2("Métodos"), ...TEXTO_FIJO.metodos.map(m => Body("• " + m)),
        H2("Resultados"), ...TEXTO_FIJO.resultados.map(m => Body("• " + m)),
        H1("Análisis Operacional"),
        H2("Cantidad de mantenciones por fecha"),
        ...(toBytes(chartMantFechaUrl) ? [imgParagraph(toBytes(chartMantFechaUrl)!)] : tablePro("Mantenciones agrupadas por fecha.", ["Fecha", "Cantidad"], mantPorFecha)),
        H2("Distribución de Servicios"),
        ...(toBytes(chartDistribucionUrl) ? [imgParagraph(toBytes(chartDistribucionUrl)!, 500, 320)] : []),
        H2("Solicitudes programadas vs adicionales"),
        ...(toBytes(chartSolicitudesPieUrl) ? [imgParagraph(toBytes(chartSolicitudesPieUrl)!, 500, 320)] : tablePro("Distribución.", ["Tipo", "Cantidad"], tiposVisita)),
        H2("Actividades de mantenimiento"),
        ...(toBytes(chartMantenimientosUrl) ? [imgParagraph(toBytes(chartMantenimientosUrl)!)] : tablePro("Actividades.", ["Ítem", "Cantidad"], actividadesMantenimiento.map(r => ({ Ítem: r.Ítem, Cantidad: String(r.Cantidad) })))),
        H2(`Mantenciones Remotas — ${empresaNombre} (${periodoTexto})`),
        Body(`Durante el periodo ${periodoTexto} se ejecutaron ${data.mantencionesRemotas?.length ?? 0} mantenciones remotas.`),
        ...tablePro("Detalle de mantenciones remotas.", ["ID", "Técnico", "Inicio", "Fin", "Estado", "Usuario"],
          (data.mantencionesRemotas ?? []).map(m => ({
            ID: m.id_mantencion, Técnico: m.tecnico?.nombre ?? "—",
            Inicio: m.inicio ? new Date(m.inicio).toLocaleString("es-CL") : "—",
            Fin: m.fin ? new Date(m.fin).toLocaleString("es-CL") : "—",
            Estado: (m.status ?? "").toUpperCase(), Usuario: m.solicitante ?? "—",
          }))),

        H1("Resumen mensual de mantenciones remotas"),
        Body("Resumen mensual de sesiones y tiempo invertido en mantenciones remotas para la empresa seleccionada."),
        Body(teamViewerMonthlySummaryText),

        ...(tvSummary
          ? [
            Body(
              `Total sesiones: ${tvSummary.totalSesiones} · Total minutos: ${tvSummary.totalMinutos} · Total horas equivalentes: ${formatHorasMinutos(tvSummary.totalMinutos)}`
            ),
          ]
          : [Note("No hay resumen disponible para mantenciones remotas.")]),

        ...(tvBreakdownRows.length > 0
          ? tableProRight(
            "Detalle mensual de mantenciones remotas.",
            ["Mes", "Sesiones", "Minutos", "Horas"],
            tvBreakdownRows,
            [22, 18, 18, 18]
          )
          : [Note("No hay datos mensuales de mantenciones remotas para este período.")]),

        H2("Top 5 usuarios con más solicitudes"),
        ...(toBytes(chartTopUsuariosUrl) ? [imgParagraph(toBytes(chartTopUsuariosUrl)!)] : tablePro("Top usuarios.", ["Usuario", "Solicitudes"], topUsuariosRows)),
        H2("Cantidad de mantenciones por usuario"),
        ...(toBytes(chartMantUsuarioUrl) ? [imgParagraph(toBytes(chartMantUsuarioUrl)!)] : tablePro("Mantenciones por usuario.", ["Usuario", "Cantidad"], mantPorUsuarioTop)),
        H2("Inventario de equipos por marca"),
        ...(toBytes(chartEquiposMarcaUrl) ? [imgParagraph(toBytes(chartEquiposMarcaUrl)!)] : tablePro("Equipos por marca.", ["Marca", "Cantidad"], marcasLabels.map(m => ({ Marca: m, Cantidad: String(marcasConteo[m]) })))),

        H1("Detalle de Gestión"),
        H2("Tickets"),
        ...tablePro(
          "Detalle de tickets.",
          ["ID", "Asunto", "Estado", "Fecha creación", "Fecha resolución", "Técnico asignado", "Correo solicitante"],
          ticketsRows
        ),
        H2("Top 5 solicitantes con más tickets"),
        ...(toBytes(chartTopSolicitantesTicketsUrl)
          ? [imgParagraph(toBytes(chartTopSolicitantesTicketsUrl)!)]
          : tablePro(
            "Solicitantes con mayor cantidad de tickets generados.",
            ["Solicitante", "Tickets"],
            topSolicitantesTickets
          )),
        H1("Resumen mensual de tickets"),
        Body("Resumen mensual de tickets, tiempos estimados y complejidad para la empresa seleccionada."),
        Body(dashboardMonthlySummary),

        ...(dashboardMonthlyRows.length > 0
          ? tableProRight(
            "Detalle mensual de tickets.",
            ["Mes", "Tickets", "Cerrados", "Horas est.", "% ≤ 8h", "Mediana", "Complejos"],
            dashboardMonthlyRows,
            [16, 14, 14, 18, 14, 12, 12]
          )
          : [Note("No hay datos de dashboard mensual para este período.")]),
        H1("Resumen de visitas técnicas"),
        Body("Resumen del tiempo efectivo invertido en jornadas de atención presencial durante el período seleccionado."),
        Body(resumenVisitasTecnicas),
        ...tableProRight(
          "Resumen consolidado de visitas técnicas.",
          ["Indicador", "Valor"],
          [
            { Indicador: "Jornadas únicas", Valor: totalJornadasVisitas },
            { Indicador: "Tiempo total invertido", Valor: formatHorasMinutos(totalMinutosVisitas) },
          ],
          [70, 30]
        ),
        H2("Visitas Técnicas"), ...tablePro("Visitas realizadas.", ["Técnico", "Fecha", "Horario", "Usuario", "Estado"], visitasRows),
        H2("Configuraciones y Otros (totales)"), ...tablePro("Totales.", ["Ítem", "Cantidad"], extras.totales.map(r => ({ Ítem: r.Ítem, Cantidad: String(r.Cantidad) }))),
        H2("Detalle de \"Otros\""), ...tablePro("Detalles 'Otros'.", ["Detalle otros", "Cantidad"], (extras.detalles.length ? extras.detalles : [{ Detalle: "—", Cantidad: 0 }]).map(d => ({ "Detalle otros": d.Detalle, Cantidad: String(d.Cantidad) }))),

        H1("Total mensual de horas de soporte"),
        Body("Consolidado total del tiempo invertido en soporte durante el período seleccionado."),
        Body(totalSoporteResumen),
        Body(
          `Tickets: ${totalHorasTickets.toFixed(1)}h · Mantenciones remotas: ${formatHorasMinutos(totalMinutosRemotas)} · Visitas técnicas: ${formatHorasMinutos(totalMinutosVisitas)} · Total general: ${totalHorasSoporte.toFixed(1)}h`
        ),
        ...tableProRight(
          "Resumen consolidado de horas de soporte.",
          ["Concepto", "Tiempo"],
          [
            { Concepto: "Tickets", Tiempo: `${totalHorasTickets.toFixed(1)}h` },
            { Concepto: "Mantenciones remotas", Tiempo: formatHorasMinutos(totalMinutosRemotas) },
            { Concepto: "Visitas técnicas (jornadas únicas)", Tiempo: formatHorasMinutos(totalMinutosVisitas) },
            { Concepto: "Total general", Tiempo: `${totalHorasSoporte.toFixed(1)}h` },
          ],
          [70, 30]
        ),

        H2("Usuarios y Correos activos"), ...tablePro("Listado de correos.", ["#", "Nombre", "Correo"], correosRows),
        H2("Inventario de Equipamiento"), ...tablePro("Inventario.", ["Serial", "Marca", "Modelo", "RAM", "Disco", "Propiedad", "Solicitante"], inventarioRows),
        H1("Análisis y Recomendaciones del periodo"),

        ...informeIASections.flatMap(section => [
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [new TextRun({
              text: section.title.replace(/^\d+\.\s+/, ""),
              bold: true,
              color: THEME.text,  // oscuro, no azul
              size: 24,
              font: "Calibri"
            })]
          }),
          ...section.lines.map(line =>
            new Paragraph({
              spacing: { after: 140, line: 320 },
              children: [new TextRun({
                text: line,
                bold: false,        // ← fuerza no bold
                color: THEME.text,
                size: 22,
                font: "Calibri"
              })]
            })
          )
        ]),

        Divider(),
      ];

      const doc = new Document({
        styles: { default: { document: { run: { font: "Calibri", size: 22, color: THEME.text } } } },
        sections: [{
          properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } }, type: SectionType.CONTINUOUS },
          headers: { default: buildHeader(empresaNombre) },
          footers: { default: buildFooter() },
          children: docChildren,
        }],
      });

      const fileName = `Informe_${empresaNombre}_${periodoTexto || "Periodo"}.docx`;
      const blob = await Packer.toBlob(doc);
      saveAs(blob, fileName);

      // Upload al backend
      const blobToBase64 = (b: Blob): Promise<string> =>
        new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onloadend = () => resolve((r.result as string).split(",")[1]);
          r.onerror = reject;
          r.readAsDataURL(b);
        });
      const base64Docx = await blobToBase64(blob);
      
      // Sube a SharePoint + Supabase y crea UN registro
      await http.post("/reportes-upload/upload-docx", {
        fileName,
        empresaId: Number(empresaFiltro),
        empresa: empresaNombre,
        periodo: periodoTexto || "Periodo",
        tipo: "DOCX",
        fileBase64: base64Docx,
      });

      setExportStatus({ exporting: false, error: null });
    } catch (e) {
      console.error(e);
      setExportStatus({ exporting: false, error: "No se pudo generar el Word (DOCX)." });
    }
  };

  // ─── XLSX ────────────────────────────────────────────────────────────

  const exportXLSX = async () => {
    try {
      setExportStatus({ exporting: true, error: null });
      const data = await obtenerDatosReporteGeneral(empresaFiltro, selectedYear, selectedMonth);
      onDataLoaded(data);

      const wb = XLSX.utils.book_new();
      const sMap = new Map<number, string>();
      for (const s of data.solicitantes)
        if (typeof s.id_solicitante === "number") sMap.set(s.id_solicitante, s.nombre ?? "");

      const addSheet = <T,>(items: T[], name: string, mapper: (r: T) => Record<string, string | number>) => {
        const ws = XLSX.utils.json_to_sheet(items.length ? items.map(mapper) : [{ Mensaje: "No hay datos disponibles" }]);
        applyBasicStyles(ws);
        XLSX.utils.book_append_sheet(wb, ws, name);
      };

      const wsResumen = XLSX.utils.json_to_sheet([
        { Métrica: "Empresa", Valor: empresaNombre },
        { Métrica: "Periodo", Valor: periodoTexto || "-" },
        { Métrica: "Total Solicitantes", Valor: data.solicitantes.length },
        { Métrica: "Total Equipos", Valor: data.equipos.length },
        { Métrica: "Total Visitas", Valor: data.visitas.length },
        { Métrica: "Total Tickets", Valor: data.tickets.length },
        { Métrica: "Fecha de Reporte", Valor: new Date().toLocaleDateString("es-CL") },
        { Métrica: "Hora de Generación", Valor: new Date().toLocaleTimeString("es-CL") },
      ]);
      applyBasicStyles(wsResumen);
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen Ejecutivo");

      addSheet(data.solicitantes, "Solicitantes", (s) => ({
        ID: s.id_solicitante, Nombre: s.nombre ?? "", Email: s.email ?? "No disponible",
        Empresa: s.empresa?.nombre ?? "", "Cantidad de Equipos": Array.isArray(s.equipos) ? s.equipos.length : 0,
      }));

      const wsEquipos = XLSX.utils.json_to_sheet(data.equipos.map((e) => ({
        Serial: e.serial ?? "", Marca: e.marca ?? "", Modelo: e.modelo ?? "",
        RAM: e.ram ?? "", Disco: e.disco ?? "", Propiedad: e.propiedad ?? "",
        Solicitante: e.idSolicitante != null ? sMap.get(e.idSolicitante) ?? "" : "",
      })));
      applyBasicStyles(wsEquipos);
      XLSX.utils.book_append_sheet(wb, wsEquipos, "Equipos");

      addSheet(data.visitas, "Visitas Técnicas", (v) => ({
        Técnico: v.tecnico?.nombre ?? "—",
        "Fecha de Visita": v.inicio ? new Date(v.inicio).toLocaleDateString("es-CL") : "",
        Horario: v.inicio && v.fin ? `${new Date(v.inicio).toLocaleTimeString("es-CL")} - ${new Date(v.fin).toLocaleTimeString("es-CL")}` : "—",
        Usuario: v.solicitante ?? v.solicitanteRef?.nombre ?? "",
        Estado: (v.status ?? "").toUpperCase() || "—",
      }));

      addSheet(data.tickets, "Tickets", (t) => ({
        ID: t.ticket_id,
        Asunto: t.subject ?? "",
        Estado: ticketStatusLabel(t.status),
        "Fecha creación": t.createdAt
          ? new Date(t.createdAt).toLocaleString("es-CL")
          : t.fecha
            ? new Date(t.fecha).toLocaleString("es-CL")
            : "—",
        "Fecha resolución": t.resolvedAt
          ? new Date(t.resolvedAt).toLocaleString("es-CL")
          : "—",
        "Técnico asignado": t.assigneeNombre ?? "—",
        "Correo solicitante": t.solicitante_email ?? "—",
      }));

      const extras = contarExtras(data.visitas);
      const wsExtTot = XLSX.utils.json_to_sheet(extras.totales);
      applyBasicStyles(wsExtTot);
      XLSX.utils.book_append_sheet(wb, wsExtTot, "Extras - Totales");
      const wsExtDet = XLSX.utils.json_to_sheet(extras.detalles.length ? extras.detalles : [{ Detalle: "—", Cantidad: 0 }]);
      applyBasicStyles(wsExtDet);
      XLSX.utils.book_append_sheet(wb, wsExtDet, "Extras - Detalle otros");

      const fileName = `Reporte_${empresaNombre.replace(/\s+/g, "_").replace(/[^\w]/g, "")}_${selectedYear}-${String(selectedMonth).padStart(2, "0")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setExportStatus({ exporting: false, error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setExportStatus({ exporting: false, error: `Error al exportar XLSX: ${msg}` });
    }
  };

  // ─── PDF ─────────────────────────────────────────────────────────────

  const generarPdfBlob = async (): Promise<string | null> => {
    try {
      setExportStatus({ exporting: true, error: null });
      const data = await obtenerDatosReporteGeneral(empresaFiltro, selectedYear, selectedMonth);
      onDataLoaded(data);

      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise<void>((r) => setTimeout(r, 50));

      const el = previewRef.current;
      if (!el) throw new Error("No se encontró el contenedor del PDF.");

      const canvas = await html2canvas(el, {
        scale: 1.2, useCORS: true, backgroundColor: "#ffffff",
        windowWidth: el.scrollWidth, windowHeight: el.scrollHeight,
        onclone: (doc) => {
          const clone = doc.getElementById("pdf-preview-root") as HTMLElement | null;
          if (clone) {
            clone.style.position = "static"; clone.style.left = "0px";
            clone.style.top = "0px"; clone.style.opacity = "1";
            clone.style.pointerEvents = "auto"; clone.style.transform = "none";
            clone.style.zIndex = "0"; clone.style.width = "794px";
          }
        },
      });

      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / pageWidth;
      const pxPerPage = pageHeight * ratio;

      const rootRect = el.getBoundingClientRect();
      const scaleY = canvas.height / el.offsetHeight;
      const safeCuts: number[] = [];

      el.querySelectorAll<HTMLTableElement>("table").forEach((tbl) => {
        tbl.querySelectorAll("tr").forEach((row) => {
          const y = (row.getBoundingClientRect().bottom - rootRect.top) * scaleY;
          safeCuts.push(Math.round(y));
        });
        const yEnd = (tbl.getBoundingClientRect().bottom - rootRect.top) * scaleY;
        safeCuts.push(Math.round(yEnd + 6 * ratio));
      });

      el.querySelectorAll("h4").forEach((h) => {
        const yTop = (h.getBoundingClientRect().top - rootRect.top) * scaleY;
        safeCuts.push(Math.max(0, Math.round(yTop - 8 * ratio)));
      });

      safeCuts.sort((a, b) => a - b);
      const uniqueCuts = Array.from(new Set(safeCuts.filter((y) => y > 0 && y < canvas.height)));

      let yCursor = 0, pageIndex = 0;
      while (yCursor < canvas.height) {
        const pageBottom = yCursor + pxPerPage;
        const candidate = uniqueCuts.filter((y) => y > yCursor + 20 && y <= pageBottom - 20).pop();
        const sliceEnd = candidate ?? Math.min(pageBottom, canvas.height);
        const sliceHeight = Math.max(1, Math.round(sliceEnd - yCursor));

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const pageCtx = pageCanvas.getContext("2d");
        if (!pageCtx) break;
        pageCtx.drawImage(canvas, 0, yCursor, canvas.width, sliceHeight, 0, 0, pageCanvas.width, pageCanvas.height);

        const pageImg = pageCanvas.toDataURL("image/png");
        if (pageIndex === 0) pdf.addImage(pageImg, "PNG", 0, 0, pageWidth, sliceHeight / ratio);
        else { pdf.addPage(); pdf.addImage(pageImg, "PNG", 0, 0, pageWidth, sliceHeight / ratio); }

        yCursor = Math.round(sliceEnd);
        pageIndex++;
      }

      const url = URL.createObjectURL(pdf.output("blob"));
      setExportStatus({ exporting: false, error: null });
      return url;
    } catch (e) {
      console.error(e);
      setExportStatus({ exporting: false, error: "No se pudo generar el PDF." });
      return null;
    }
  };

  const exportPDFToStorage = async () => {
    try {
      setExportStatus({ exporting: true, error: null });

      const data = await obtenerDatosReporteGeneral(
        empresaFiltro,
        selectedYear,
        selectedMonth
      );
      onDataLoaded(data);

      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise<void>((r) => setTimeout(r, 50));

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
            clone.style.width = "794px";
          }
        },
      });

      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const imgData = canvas.toDataURL("image/png");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);

      const blob = pdf.output("blob");
      const fileName = `Informe_${empresaNombre}_${periodoTexto || "Periodo"}.pdf`;

      const blobToBase64 = (b: Blob): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(b);
        });

      const fileBase64 = await blobToBase64(blob);

      await http.post("/reportes-upload/upload", {
        fileName,
        empresaId: Number(empresaFiltro),
        empresa: empresaNombre,
        periodo: periodoTexto || "Periodo",
        tipo: "PDF",
        fileBase64,
      });

      setExportStatus({ exporting: false, error: null });
    } catch (e) {
      console.error(e);
      setExportStatus({
        exporting: false,
        error: "No se pudo generar o subir el PDF.",
      });
    }
  };

  return { exportStatus, exportDOCX, exportDOCXIABeta, exportXLSX, generarPdfBlob, exportPDFToStorage };
};