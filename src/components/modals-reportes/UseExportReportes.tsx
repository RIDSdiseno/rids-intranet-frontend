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
  dataUrlToUint8Array, generarFolio,
} from "./UtilsReportes";

import { http } from "../../service/http";

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

const fetchLogoBytes = async (): Promise<Uint8Array | null> => {
  try {
    const res = await fetch("/login/LOGO_RIDS.png", { cache: "no-store" });
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch { return null; }
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
        ID: t.ticket_id, Asunto: t.subject ?? "", Estado: "Cerrado",
        Categoría: t.type ?? "—",
        Fecha: t.fecha ? new Date(t.fecha).toLocaleString("es-CL") : "",
      }));

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
      const logoBytes = await fetchLogoBytes();

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
        H2("Top 5 usuarios con más solicitudes"),
        ...(toBytes(chartTopUsuariosUrl) ? [imgParagraph(toBytes(chartTopUsuariosUrl)!)] : tablePro("Top usuarios.", ["Usuario", "Solicitudes"], topUsuariosRows)),
        H2("Cantidad de mantenciones por usuario"),
        ...(toBytes(chartMantUsuarioUrl) ? [imgParagraph(toBytes(chartMantUsuarioUrl)!)] : tablePro("Mantenciones por usuario.", ["Usuario", "Cantidad"], mantPorUsuarioTop)),
        H2("Inventario de equipos por marca"),
        ...(toBytes(chartEquiposMarcaUrl) ? [imgParagraph(toBytes(chartEquiposMarcaUrl)!)] : tablePro("Equipos por marca.", ["Marca", "Cantidad"], marcasLabels.map(m => ({ Marca: m, Cantidad: String(marcasConteo[m]) })))),
        H1("Detalle de Gestión"),
        H2("Tickets"), ...tablePro("Detalle de tickets.", ["ID", "Asunto", "Estado", "Categoría", "Fecha"], ticketsRows),
        H2("Visitas Técnicas"), ...tablePro("Visitas realizadas.", ["Técnico", "Fecha", "Horario", "Usuario", "Estado"], visitasRows),
        H2("Configuraciones y Otros (totales)"), ...tablePro("Totales.", ["Ítem", "Cantidad"], extras.totales.map(r => ({ Ítem: r.Ítem, Cantidad: String(r.Cantidad) }))),
        H2("Detalle de \"Otros\""), ...tablePro("Detalles 'Otros'.", ["Detalle otros", "Cantidad"], (extras.detalles.length ? extras.detalles : [{ Detalle: "—", Cantidad: 0 }]).map(d => ({ "Detalle otros": d.Detalle, Cantidad: String(d.Cantidad) }))),
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
      await http.post("/reportes-upload/upload-docx", {
        fileName,
        empresa: empresaNombre,
        periodo: periodoTexto || "Periodo",
        fileBase64: base64Docx
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
        ID: t.ticket_id, Asunto: t.subject ?? "", Estado: "Cerrado",
        Categoría: t.type ?? "—", Fecha: t.fecha ? new Date(t.fecha).toLocaleString("es-CL") : "",
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
        scale: 2, useCORS: true, backgroundColor: "#ffffff",
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

  return { exportStatus, exportDOCX, exportXLSX, generarPdfBlob };
};