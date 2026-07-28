// src/components/modals-reportes/buildReporteIABetaDocx.ts
// ─── CAMBIOS en esta versión (fix de saltos entre páginas) ─────────────────
//
//  ✓ cantSplit: true en TODAS las filas de tabla
//      → evita que una fila se parta a la mitad entre dos páginas.
//        Si no cabe, la fila entera baja limpia a la página siguiente.
//        Aplica también a las tarjetas de gráfico: badge + título + imagen +
//        lectura se mantienen SIEMPRE juntos.
//
//  ✓ Se eliminaron los saltos de página forzados que dejaban medias páginas
//    en blanco:
//      ✗ opción pageBreakAfterFirst en buildChartBlocks
//      ✗ pageBreak() antes de "Resumen del período"
//      ✗ pageBreak() antes de "Mesa de ayuda"
//      ✗ pageBreak() antes de "Inventario"
//      ✗ pageBreak() antes de "Distribución de servicios"
//    Ahora el contenido fluye y llena la página de forma natural.
//    (El helper pageBreak() se conserva por si quieres reintroducir UN salto
//     puntual en alguna sección específica.)
//
// ──────────────────────────────────────────────────────────────────────────

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  VerticalAlign,
  ShadingType,
} from "docx";
import { saveAs } from "file-saver";

// ── Tipos ──────────────────────────────────────────────────────────────────

type KPIItem = {
  nombre?: string;
  valor?: string | number;
  lectura?: string;
};

type MetricaDestacadaItem = {
  nombre?: string;
  valor?: string | number;
  lectura?: string;
};

type GraficoSugeridoItem = {
  tipo?: string;
  titulo?: string;
  dataset_key?: string;
  lectura?: string;
};

type ChartImageItem = {
  tipo?: string;
  titulo?: string;
  dataset_key?: string;
  lectura?: string;
  imageBytes?: Uint8Array | null;
};

type MantencionRemotaRow = {
  id_mantencion?: number | string;
  tecnico?: { nombre?: string } | null;
  inicio?: string | Date | null;
  fin?: string | Date | null;
  status?: string | null;
  solicitante?: string | null;
};

type TicketDetalleRow = {
  ticket_id?: number | string;
  subject?: string | null;
  type?: string | null;
  fecha?: string | Date | null;
};

type VisitaDetalleRow = {
  tecnico?: { nombre?: string } | null;
  inicio?: string | Date | null;
  fin?: string | Date | null;
  solicitante?: string | null;
  solicitanteRef?: { nombre?: string } | null;
  status?: string | null;
};

type ExtraTotalRow = { Ítem?: string; Cantidad?: string | number };
type ExtraDetalleRow = { Detalle?: string; Cantidad?: string | number };

type SolicitanteDetalleRow = {
  id_solicitante?: number | string | null;
  nombre?: string | null;
  email?: string | null;
};

type EquipoDetalleRow = {
  codigo?: number | string | null;
  usuario?: string | null;
  correo?: string | null;
  estadoEquipo?: string | null;
  serial?: string | null;
  marca?: string | null;
  modelo?: string | null;
  cpu?: string | null;
  ram?: string | null;
  disco?: string | null;
  sistemaOperativo?: string | null;

  // Compatibilidad con estructuras antiguas
  procesador?: string | null;
  estado?: string | null;
  so?: string | null;
  solicitante?: string | { nombre?: string | null; email?: string | null } | null;
  detalle?: {
    so?: string | null;
  } | null;
};

type PayloadIABeta = {
  layout?: { tipo_portada?: string; orden_secciones?: string[]; estilo_general?: string };
  titulo?: string;
  subtitulo?: string;
  resumen_ejecutivo?: string;
  metricas_destacadas?: MetricaDestacadaItem[];
  graficos_sugeridos?: GraficoSugeridoItem[];
  kpis_interpretados?: KPIItem[];
  hallazgos?: Array<{ titulo?: string; detalle?: string; impacto?: string }>;
  riesgos?: Array<{ titulo?: string; detalle?: string; nivel?: string }>;
  recomendaciones?: Array<{ prioridad?: string; titulo?: string; detalle?: string; beneficio?: string }>;
  plan_30_60_90?: { d30?: string[]; d60?: string[]; d90?: string[] };
  conclusion?: string;
};

export type ContenidoAdicionalInforme = {
  introduccion?: string;
  observaciones?: string;
  conclusion?: string;
};

export type BuildReporteIABetaDocxParams = {
  payload: PayloadIABeta;
  empresaNombre: string;
  periodoTexto: string;
  contenidoAdicional?: ContenidoAdicionalInforme;
  chartImages?: ChartImageItem[];
  mantencionesRemotas?: MantencionRemotaRow[];
  ticketsDetalle?: TicketDetalleRow[];
  visitasDetalle?: VisitaDetalleRow[];
  extrasTotales?: ExtraTotalRow[];
  extrasDetalle?: ExtraDetalleRow[];
  solicitantesDetalle?: SolicitanteDetalleRow[];
  equiposDetalle?: EquipoDetalleRow[];
  logoBytes?: Uint8Array | null;
  headerLogoBytes?: Uint8Array | null;
  licencias?: {
    total?: number;
    totalUsuariosConLicencia?: number;
    porTipo?: Array<{
      skuId?: string | null;
      skuPartNumber?: string | null;
      displayName?: string | null;
      cantidad?: number | string | null;
    }>;
  };
};

// ── Paleta de tema ─────────────────────────────────────────────────────────

const THEME = {
  primary: "1F2937",
  accent: "2563EB",
  accentSoft: "DBEAFE",
  light: "F3F4F6",
  border: "E5E7EB",
  text: "0F172A",
  muted: "475569",
  zebra: "F8FAFC",
  white: "FFFFFF",
} as const;

// ── Helpers de párrafo ─────────────────────────────────────────────────────

// ── Limpieza de emojis / caracteres no imprimibles ─────────────────────────
//
// La fuente del documento (Calibri) NO tiene glifos de emoji, así que cualquier
// emoji en el texto se dibuja como un cuadro/rombo roto ("��"). Esta función los
// elimina para que el informe se vea limpio y profesional.
// Conserva acentos, ñ, viñetas (•), guiones y símbolos normales.
function stripEmoji(text: string): string {
  return text
    // Emoji del plano astral (🖥️ 🔒 🔑 📋 ✅ etc.)
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    // Símbolos misceláneos y dingbats usados como emoji (2600–27BF)
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    // Símbolos y flechas suplementarios
    .replace(/[\u{2B00}-\u{2BFF}]/gu, "")
    // Selectores de variación (el ️ que acompaña a muchos emoji)
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")
    // Zero-width joiner y caracteres de reemplazo (el rombo "�")
    .replace(/[\u200D\uFFFD]/g, "")
    // Colapsa los espacios que queden tras quitar un emoji
    .replace(/[ \t]{2,}/g, " ");
}

function buildTextParagraphs(value?: string | null): Paragraph[] {
  if (!value?.trim()) {
    return [];
  }

  return value
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const cleanLine = line.trim();

      if (!cleanLine) {
        return spacer(60);
      }

      const isBullet =
        cleanLine.startsWith("•") || cleanLine.startsWith("- ");

      const rawText = isBullet
        ? cleanLine.replace(/^(•|-)\s*/, "")
        : cleanLine;

      // Quita emojis rotos y limpia el espacio que dejan.
      const text = stripEmoji(rawText).trim();

      // Si tras limpiar no queda nada (era solo un emoji), omite la línea.
      if (!text) {
        return spacer(40);
      }

      return new Paragraph({
        keepLines: true,
        bullet: isBullet ? { level: 0 } : undefined,
        spacing: { after: 120, line: 320 },
        children: [
          new TextRun({
            text,
            color: THEME.text,
            size: 22,
          }),
        ],
      });
    });
}

const body = (text: string) =>
  new Paragraph({
    // keepLines: mantiene TODAS las líneas del párrafo en la misma página.
    // Si no cabe al final de una página, el párrafo entero baja a la siguiente
    // en vez de partirse a la mitad.
    keepLines: true,
    spacing: { after: 120, line: 320 },
    children: [new TextRun({ text: text || "—", color: THEME.text, size: 22 })],
  });

const spacer = (pts = 60) =>
  new Paragraph({
    spacing: {
      before: 0,
      after: pts,
    },
  });

const pageBreak = () =>
  new Paragraph({
    pageBreakBefore: true,
    spacing: { before: 0, after: 0 },
  });

const pageBreakIfNeeded = (enabled: boolean) =>
  enabled ? [pageBreak()] : [];

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
const noBorders = {
  top: noBorder, right: noBorder, bottom: noBorder,
  left: noBorder, insideHorizontal: noBorder, insideVertical: noBorder,
};

// ── Header / Footer ────────────────────────────────────────────────────────

const buildHeader = (empresaNombre: string, headerLogoBytes?: Uint8Array | null) =>
  new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 72, type: WidthType.PERCENTAGE },
                borders: noBorders,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    children: [
                      new TextRun({
                        text: `Informe · ${empresaNombre}`,
                        color: THEME.muted,
                        size: 18,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 28, type: WidthType.PERCENTAGE },
                borders: noBorders,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: headerLogoBytes
                      ? [new ImageRun({ data: headerLogoBytes, type: "png", transformation: { width: 120, height: 36 } })]
                      : [new TextRun({ text: "" })],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: THEME.border } },
        spacing: { after: 100 },
      }),
    ],
  });

const buildFooter = () =>
  new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Página ", color: THEME.muted, size: 18 }),
          new TextRun({ children: [PageNumber.CURRENT], color: THEME.muted, size: 18 }),
        ],
      }),
    ],
  });

// ── Portada premium ────────────────────────────────────────────────────────

const buildHeroPremium = (
  titulo: string,
  subtitulo: string,
  empresaNombre: string,
  periodoTexto: string,
  logoBytes?: Uint8Array | null
) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            shading: { fill: "0F2B67" },
            margins: { top: 220, bottom: 220, left: 240, right: 240 },
            children: [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    cantSplit: true,
                    children: [
                      // Columna izquierda — texto
                      new TableCell({
                        width: { size: 58, type: WidthType.PERCENTAGE },
                        borders: noBorders,
                        children: [
                          ...(logoBytes
                            ? [new Paragraph({ spacing: { after: 70 }, children: [new ImageRun({ data: logoBytes, type: "png", transformation: { width: 170, height: 52 } })] })]
                            : []),
                          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "ASESORÍAS RIDS · REPORTE MENSUAL", bold: true, size: 18, color: "DCE7FF" })] }),
                          new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: titulo, bold: true, size: 42, color: "FFFFFF" })] }),
                          new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: subtitulo, size: 24, color: "E2E8F0" })] }),
                          new Paragraph({ children: [new TextRun({ text: `${empresaNombre} · Periodo ${periodoTexto || "No definido"}`, bold: true, size: 22, color: "FFFFFF" })] }),
                        ],
                      }),
                      // Columna derecha — resumen de emisión
                      new TableCell({
                        width: { size: 42, type: WidthType.PERCENTAGE },
                        borders: noBorders,
                        children: [
                          new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [
                              new TableRow({
                                cantSplit: true,
                                children: [
                                  new TableCell({
                                    shading: { fill: "335FBA" },
                                    margins: { top: 140, bottom: 140, left: 160, right: 160 },
                                    borders: {
                                      top: { style: BorderStyle.SINGLE, size: 4, color: "5D84D1" },
                                      right: { style: BorderStyle.SINGLE, size: 4, color: "5D84D1" },
                                      bottom: { style: BorderStyle.SINGLE, size: 4, color: "5D84D1" },
                                      left: { style: BorderStyle.SINGLE, size: 4, color: "5D84D1" },
                                    },
                                    children: [
                                      new Paragraph({ spacing: { after: 70 }, children: [new TextRun({ text: "RESUMEN DE EMISIÓN", bold: true, size: 22, color: "DCE7FF" })] }),
                                      new Paragraph({ spacing: { after: 45 }, children: [new TextRun({ text: `Cliente: ${empresaNombre}`, bold: true, size: 20, color: "FFFFFF" })] }),
                                      new Paragraph({ spacing: { after: 45 }, children: [new TextRun({ text: `Periodo: ${periodoTexto || "No definido"}`, bold: true, size: 20, color: "FFFFFF" })] }),
                                      new Paragraph({ spacing: { after: 45 }, children: [new TextRun({ text: "Versión: Informe Visual", size: 20, color: "FFFFFF" })] }),
                                      new Paragraph({ children: [new TextRun({ text: "Datos reales del sistema interno de RIDS.", size: 18, color: "E2E8F0" })] }),
                                    ],
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

// ── Panel KPI — 4 tarjetas en una fila ────────────────────────────────────

const buildKpiDashboard = (
  cards: { label: string; value: string; helper: string; fill: string; accent: string }[]
) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        cantSplit: true,
        children: cards.map((card) =>
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: card.fill },
            margins: { top: 160, bottom: 160, left: 160, right: 160 },
            children: [
              new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: "▁▁▁", bold: true, size: 20, color: card.accent })] }),
              new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: card.label, bold: true, size: 22, color: THEME.muted })] }),
              new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: card.value, bold: true, size: 34, color: THEME.primary })] }),
              new Paragraph({ children: [new TextRun({ text: card.helper, size: 18, color: THEME.muted })] }),
            ],
          })
        ),
      }),
    ],
  });

// ── Tabla de métricas destacadas compacta ─────────────────────────────────

const buildMetricasTable = (items: MetricaDestacadaItem[]) => {
  if (!items.length) return null;

  const headerRow = new TableRow({
    cantSplit: true,
    tableHeader: true,
    children: ["Métrica", "Valor", "Lectura ejecutiva"].map((t) =>
      new TableCell({
        shading: { fill: THEME.primary },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: t, bold: true, color: "FFFFFF", size: 20 })],
          }),
        ],
      })
    ),
  });

  const bodyRows = items.map((item, i) =>
    new TableRow({
      cantSplit: true,
      children: [
        String(item.nombre ?? "—"),
        String(item.valor ?? "—"),
        String(item.lectura ?? "—"),
      ].map((val) =>
        new TableCell({
          shading: { fill: i % 2 === 0 ? THEME.zebra : THEME.white },
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: val, color: THEME.text, size: 20 })],
            }),
          ],
        })
      ),
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  });
};

// ── Sección separadora de bloque ───────────────────────────────────────────
//
// Antes era una Table independiente; el problema es que keepNext NO cruza el
// borde de una tabla, así que el encabezado quedaba huérfano al pie de página.
//
// Ahora son párrafos sombreados (mismo look: caja gris + barra azul a la
// izquierda) con keepNext:true, que SÍ se mantienen junto al bloque siguiente
// (tabla, gráfico o párrafo). El espacio inferior va incorporado, por lo que
// ya NO se debe agregar un spacer() justo después del encabezado.

const SECTION_SHADING = {
  type: ShadingType.CLEAR,
  color: "auto",
  fill: THEME.light,
} as const;

const SECTION_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 2, color: THEME.light },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: THEME.light },
  left: { style: BorderStyle.SINGLE, size: 16, color: THEME.accent, space: 6 },
} as const;

const buildSectionHeader = (title: string, subtitle?: string): Paragraph[] => {
  const titlePara = new Paragraph({
    keepNext: true,
    keepLines: true,
    shading: SECTION_SHADING,
    border: SECTION_BORDER,
    indent: { left: 120 },
    spacing: { before: 200, after: subtitle ? 0 : 160 },
    children: [new TextRun({ text: title, bold: true, size: 28, color: THEME.primary })],
  });

  if (!subtitle) return [titlePara];

  const subtitlePara = new Paragraph({
    keepNext: true,
    keepLines: true,
    shading: SECTION_SHADING,
    border: SECTION_BORDER,
    indent: { left: 120 },
    spacing: { before: 0, after: 160 },
    children: [new TextRun({ text: subtitle, size: 20, color: THEME.muted })],
  });

  return [titlePara, subtitlePara];
};

// ── Mapa de estilos por dataset_key ───────────────────────────────────────

const DATASET_STYLES: Record<string, { bg: string; accent: string; badge: string }> = {
  mantenciones_por_fecha: { bg: "EEF6FF", accent: "2563EB", badge: "Tendencia operacional" },
  distribucion_servicios: { bg: "ECFDF5", accent: "059669", badge: "Distribución del servicio" },
  solicitudes_programadas_vs_adicionales: { bg: "F5F3FF", accent: "7C3AED", badge: "Planificado vs adicional" },
  actividades_mantenimiento: { bg: "FFF7ED", accent: "EA580C", badge: "Actividad preventiva" },
  inventario_por_marca: { bg: "FEF2F2", accent: "DC2626", badge: "Composición tecnológica" },
  tickets_por_categoria: { bg: "EEF2FF", accent: "4F46E5", badge: "Mesa de ayuda" },
  tickets_top_usuarios: { bg: "ECFDF5", accent: "16A34A", badge: "Focos de demanda" },
  tickets_top_solicitantes: { bg: "FFF0F3", accent: "E11D48", badge: "Solicitantes frecuentes" },
  visitas_por_tecnico: { bg: "EFF6FF", accent: "0284C7", badge: "Cobertura en terreno" },
  visitas_por_tipo: { bg: "FDF4FF", accent: "C026D3", badge: "Tipo de visita" },
  mantenciones_por_status: { bg: "FEFCE8", accent: "CA8A04", badge: "Estado de ejecución" },
  mantenciones_por_tecnico: { bg: "ECFEFF", accent: "0891B2", badge: "Carga por técnico" },
};

const FALLBACK_STYLES = [
  { bg: "EEF6FF", accent: "2563EB", badge: "Visual ejecutivo" },
  { bg: "ECFDF5", accent: "059669", badge: "Visual ejecutivo" },
  { bg: "F5F3FF", accent: "7C3AED", badge: "Visual ejecutivo" },
  { bg: "FFF7ED", accent: "EA580C", badge: "Visual ejecutivo" },
];

function getStyle(datasetKey?: string, index = 0) {
  return (datasetKey && DATASET_STYLES[datasetKey])
    ? DATASET_STYLES[datasetKey]
    : FALLBACK_STYLES[index % FALLBACK_STYLES.length];
}

// ── Escalado de imágenes respetando proporción ─────────────────────────────
//
// Problema: forzar un ancho y alto fijos (p. ej. 300x250) DEFORMA la imagen si
// su proporción real es distinta. Un gráfico circular cuadrado metido en un
// recuadro rectangular se ve como óvalo y con bordes dentados (el estirado no
// uniforme genera ese aspecto "pixeleado").
//
// Solución: leer el tamaño real del PNG y escalarlo proporcionalmente para que
// quepa dentro de un recuadro máximo, sin deformarlo.

/** Lee ancho y alto reales de un PNG desde su cabecera (chunk IHDR). */
function readPngSize(bytes?: Uint8Array | null): { width: number; height: number } | null {
  if (!bytes || bytes.length < 24) return null;
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== signature[i]) return null;
  }
  const width =
    ((bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]) >>> 0;
  const height =
    ((bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]) >>> 0;
  return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * Devuelve { width, height } (en px @96dpi) para que la imagen quepa dentro de
 * un recuadro maxW x maxH manteniendo su proporción original.
 * Si no se puede leer el tamaño del PNG, usa el recuadro completo (fallback).
 */
function fitTransformation(
  bytes: Uint8Array | null | undefined,
  maxW: number,
  maxH: number
): { width: number; height: number } {
  const size = readPngSize(bytes);
  if (!size) return { width: maxW, height: maxH };
  const ratio = Math.min(maxW / size.width, maxH / size.height);
  return {
    width: Math.max(1, Math.round(size.width * ratio)),
    height: Math.max(1, Math.round(size.height * ratio)),
  };
}

// ── Tarjeta de gráfico individual (ancho completo) ─────────────────────────

const buildChartCard = (grafico: ChartImageItem, index: number): Table => {
  const style = getStyle(grafico.dataset_key, index);

  const contentChildren: Paragraph[] = [
    // Badge de categoría
    new Paragraph({
      spacing: { after: 45 },
      children: [new TextRun({ text: style.badge.toUpperCase(), bold: true, size: 17, color: style.accent })],
    }),
    // Título del gráfico
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: grafico.titulo || "Visualización", bold: true, size: 26, color: THEME.primary })],
    }),
    // Imagen o mensaje sin datos
    ...(grafico.imageBytes
      ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 50 },
          children: [
            new ImageRun({
              data: grafico.imageBytes,
              type: "png",
              // Escala proporcional dentro de un recuadro de 660x420px. El alto
              // amplio permite que los gráficos casi cuadrados (pie/donut) salgan
              // grandes; los de barras siguen limitados por el ancho (660).
              transformation: fitTransformation(grafico.imageBytes, 660, 420),
            }),
          ],
        }),
      ]
      : [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 50 },
          children: [new TextRun({ text: "Sin datos suficientes para este período.", italics: true, size: 20, color: THEME.muted })],
        }),
      ]),
    // Lectura ejecutiva
    new Paragraph({
      children: [
        new TextRun({ text: "▶ ", bold: true, size: 18, color: style.accent }),
        new TextRun({
          text: grafico.lectura || "Sin lectura ejecutiva disponible.",
          size: 20,
          color: THEME.text,
        }),
      ],
    }),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        // Mantiene badge + título + imagen + lectura SIEMPRE en la misma página.
        cantSplit: true,
        children: [
          new TableCell({
            shading: { fill: style.bg },
            margins: { top: 90, bottom: 90, left: 120, right: 120 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: style.accent },
              left: { style: BorderStyle.SINGLE, size: 12, color: style.accent },
              right: { style: BorderStyle.SINGLE, size: 4, color: THEME.border },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: THEME.border },
            },
            children: contentChildren,
          }),
        ],
      }),
    ],
  });
};

// ── Dos gráficos en paralelo (layout 2 columnas) ───────────────────────────
// Se usa cuando los gráficos son de tipo pie/donut (más cuadrados)

const buildChartPair = (
  left: ChartImageItem,
  right: ChartImageItem,
  leftIndex: number
): Table => {
  const buildCell = (grafico: ChartImageItem, index: number) => {
    const style = getStyle(grafico.dataset_key, index);
    return new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      shading: { fill: style.bg },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: style.accent },
        left: { style: BorderStyle.SINGLE, size: 10, color: style.accent },
        right: { style: BorderStyle.SINGLE, size: 4, color: THEME.border },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: THEME.border },
      },
      children: [
        new Paragraph({
          spacing: { after: 35 },
          children: [new TextRun({ text: style.badge.toUpperCase(), bold: true, size: 16, color: style.accent })],
        }),
        new Paragraph({
          spacing: { after: 50 },
          children: [new TextRun({ text: grafico.titulo || "Visualización", bold: true, size: 22, color: THEME.primary })],
        }),
        ...(grafico.imageBytes
          ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 40 },
              children: [
                new ImageRun({
                  data: grafico.imageBytes,
                  type: "png",
                  // Escala proporcional dentro de un recuadro de 320x300px por
                  // columna. Evita que los circulares se deformen en óvalos.
                  transformation: fitTransformation(grafico.imageBytes, 320, 300),
                }),
              ],
            }),
          ]
          : [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 40 },
              children: [new TextRun({ text: "Sin datos suficientes.", italics: true, size: 18, color: THEME.muted })],
            }),
          ]),
        new Paragraph({
          children: [
            new TextRun({ text: "▶ ", bold: true, size: 16, color: style.accent }),
            new TextRun({ text: grafico.lectura || "—", size: 18, color: THEME.text }),
          ],
        }),
      ],
    });
  };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        // Mantiene el par de gráficos junto en la misma página.
        cantSplit: true,
        children: [
          buildCell(left, leftIndex),
          // Separador invisible entre columnas
          new TableCell({
            width: { size: 2, type: WidthType.PERCENTAGE },
            borders: noBorders,
            shading: { fill: "FFFFFF" },
            children: [new Paragraph({ children: [] })],
          }),
          buildCell(right, leftIndex + 1),
        ],
      }),
    ],
  });
};

// ── Decisión de layout por tipo de gráfico ────────────────────────────────

// Interruptor de layout de gráficos circulares (pie/donut):
//   false → cada gráfico a ANCHO COMPLETO, uno por fila. Más grande y con el
//           texto/leyenda legibles (recomendado si el texto se ve pequeño).
//   true  → pie/donut consecutivos en 2 columnas (más compacto, pero el texto
//           queda pequeño porque cada columna es angosta).
const PAIR_PIE_CHARTS = false;

function isPieType(tipo?: string): boolean {
  const t = (tipo || "").toLowerCase();
  return t === "pie" || t === "doughnut";
}

/**
 * Organiza los gráficos en bloques:
 *   - Con PAIR_PIE_CHARTS=true: pie/donut consecutivos → pares en 2 columnas.
 *   - Con PAIR_PIE_CHARTS=false (por defecto): todos a ancho completo, lo que
 *     hace los gráficos (y su texto) mucho más grandes.
 *
 * Nota: ya NO se fuerzan saltos de página aquí. Con cantSplit:true cada
 * tarjeta se mantiene íntegra, así que Word decide el corte de página
 * automáticamente sin cortar títulos ni imágenes.
 */
function buildChartBlocks(graficos: ChartImageItem[]): (Table | Paragraph)[] {
  const blocks: (Table | Paragraph)[] = [];
  let i = 0;

  while (i < graficos.length) {
    const current = graficos[i];
    const next = graficos[i + 1];

    if (
      PAIR_PIE_CHARTS &&
      isPieType(current.tipo) &&
      next &&
      isPieType(next.tipo)
    ) {
      blocks.push(buildChartPair(current, next, i));
      blocks.push(spacer(40));
      i += 2;
    } else {
      blocks.push(buildChartCard(current, i));
      blocks.push(spacer(40));
      i += 1;
    }
  }

  return blocks;
}

// ── Utilidades ─────────────────────────────────────────────────────────────

function normalizeArray<T>(items: T[] | undefined, fallback: T[]): T[] {
  return items && items.length ? items : fallback;
}

function compactText(value?: string | number | null): string {
  return String(value ?? "—").replace(/\s+/g, " ").trim() || "—";
}

// ── Helpers de tabla reutilizables ─────────────────────────────────────────

/** Celda de encabezado con fondo oscuro y texto blanco en negrita */
function tableHeaderCell(text: string): TableCell {
  return new TableCell({
    shading: { fill: THEME.primary },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 20 })],
      }),
    ],
  });
}

/** Celda de datos con texto normal */
function tableCell(text: string): TableCell {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, color: THEME.text, size: 20 })],
      }),
    ],
  });
}

function tableHeaderCellCompact(text: string, keepNext = false): TableCell {
  return new TableCell({
    shading: { fill: THEME.primary },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 45, right: 45 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        keepNext,
        keepLines: true,
        children: [
          new TextRun({
            text,
            bold: true,
            color: "FFFFFF",
            size: 12,
          }),
        ],
      }),
    ],
  });
}

function tableCellCompact(
  text: string | number | null | undefined,
  keepNext = false
): TableCell {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 35, bottom: 35, left: 45, right: 45 },
    children: [
      new Paragraph({
        keepNext,
        keepLines: true,
        children: [
          new TextRun({
            text: String(text ?? "—"),
            color: THEME.text,
            size: 12,
          }),
        ],
      }),
    ],
  });
}

function getSolicitanteNombre(value: EquipoDetalleRow["solicitante"]) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.nombre ?? "";
}

function getSolicitanteCorreo(value: EquipoDetalleRow["solicitante"]) {
  if (!value || typeof value === "string") return "";
  return value.email ?? "";
}

function buildInventarioEquiposTables(equipos: EquipoDetalleRow[]): Table[] {
  if (!equipos.length) return [];

  const headers = [
    "Código",
    "Usuario",
    "Correo",
    "Estado",
    "Serial",
    "Marca",
    "Modelo",
    "CPU",
    "RAM",
    "Disco",
    "Sistema operativo",
  ];

  const rows = equipos.map((equipo, index) => [
    equipo.codigo ?? index + 1,
    equipo.usuario ?? getSolicitanteNombre(equipo.solicitante),
    equipo.correo ?? getSolicitanteCorreo(equipo.solicitante),
    equipo.estadoEquipo ?? equipo.estado ?? "",
    equipo.serial ?? "",
    equipo.marca ?? "",
    equipo.modelo ?? "",
    equipo.cpu ?? equipo.procesador ?? "",
    equipo.ram ?? "",
    equipo.disco ?? "",
    equipo.sistemaOperativo ?? equipo.detalle?.so ?? equipo.so ?? "",
  ]);

  // Una SOLA tabla continua. El encabezado se marca con tableHeader:true, por
  // lo que Word/Word-compatible lo repite automáticamente al inicio de cada
  // página. Las filas llevan cantSplit:true para no cortarse a la mitad, pero
  // la tabla SÍ puede fluir de una página a la siguiente (ya no se trocea en
  // tablas separadas). Resultado: se ve como una única tabla conjunta.
  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((header) => tableHeaderCellCompact(header)),
  });

  const bodyRows = rows.map(
    (row) =>
      new TableRow({
        cantSplit: true,
        children: row.map((value) => tableCellCompact(value)),
      })
  );

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...bodyRows],
    }),
  ];
}

// ── Función principal ──────────────────────────────────────────────────────

export async function buildReporteIABetaDocxBlob({
  payload,
  empresaNombre,
  periodoTexto,
  contenidoAdicional,
  chartImages = [],
  mantencionesRemotas = [],
  ticketsDetalle = [],
  visitasDetalle = [],
  solicitantesDetalle = [],
  equiposDetalle = [],
  logoBytes = null,
  headerLogoBytes = null,
}: BuildReporteIABetaDocxParams): Promise<Blob> {
  const titulo = payload?.titulo || "Informe Ejecutivo de Operaciones TI";
  const subtitulo = payload?.subtitulo || "Versión Visual";

  // ── 1. Enriquecer gráficos con imágenes ──────────────────────────────────
  const graficosBase = normalizeArray(payload?.graficos_sugeridos, [
    { tipo: "bar", titulo: "Sin gráficos disponibles", dataset_key: "tickets_por_categoria", lectura: "No se definieron gráficos para este periodo." },
  ]);

  const graficosConImagen: ChartImageItem[] = graficosBase.map((g) => {
    const found = chartImages.find((c) => c.dataset_key === g.dataset_key);
    return { ...g, imageBytes: found?.imageBytes ?? null };
  });

  // ── 2. Panel KPI ─────────────────────────────────────────────────────────
  const metricasDestacadas = normalizeArray(payload?.metricas_destacadas, []);

  const panelCards = [
    {
      label: "TICKETS",
      value: String(ticketsDetalle.length || metricasDestacadas.find((m) => compactText(m.nombre).toLowerCase().includes("ticket"))?.valor || "0"),
      helper: "Incidencias atendidas",
      fill: "E8F0FF",
      accent: "2563EB",
    },
    {
      label: "MANTENCIONES REMOTAS",
      value: String(mantencionesRemotas.length || metricasDestacadas.find((m) => compactText(m.nombre).toLowerCase().includes("mantencion"))?.valor || "0"),
      helper: "Sesiones remotas del periodo",
      fill: "E7F7EF",
      accent: "059669",
    },
    {
      label: "USUARIOS",
      value: String(solicitantesDetalle.length || "0"),
      helper: "Solicitantes activos",
      fill: "F1EAFE",
      accent: "7C3AED",
    },
    {
      label: "INVENTARIO",
      value: String(equiposDetalle.length || metricasDestacadas.find((m) => compactText(m.nombre).toLowerCase().includes("inventario"))?.valor || "0"),
      helper: "Activos registrados",
      fill: "FFF4E6",
      accent: "D97706",
    },
  ];

  // ── 3. Tabla de métricas IA ───────────────────────────────────────────────
  const metricasTable = metricasDestacadas.length > 0
    ? buildMetricasTable(metricasDestacadas)
    : null;

  const inventarioEquiposTables = buildInventarioEquiposTables(equiposDetalle);

  // ── 4. Clasificar gráficos en grupos temáticos ────────────────────────────
  //
  // Orden recomendado para una lectura fluida:
  //   A) Actividad y cobertura (visitas, mantenciones)
  //   B) Mesa de ayuda / tickets
  //   C) Inventario y recursos
  //   D) Complementarios (distribución, tipos)
  //
  const GROUP_ORDER = [
    "mantenciones_por_fecha",
    "visitas_por_tecnico",
    "mantenciones_por_tecnico",
    "tickets_por_categoria",
    "tickets_top_usuarios",
    "inventario_por_marca",
    "distribucion_servicios",
    "solicitudes_programadas_vs_adicionales",
    "actividades_mantenimiento",
    "visitas_por_tipo",
    "mantenciones_por_status",
  ];

  const sortedGraficos = [...graficosConImagen].sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a.dataset_key ?? "");
    const bi = GROUP_ORDER.indexOf(b.dataset_key ?? "");
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  // Separar en grupos temáticos para añadir secciones separadoras
  const grupoActividad = sortedGraficos.filter((g) => ["mantenciones_por_fecha", "visitas_por_tecnico", "mantenciones_por_tecnico"].includes(g.dataset_key ?? ""));
  const grupoTickets = sortedGraficos.filter((g) => ["tickets_por_categoria", "tickets_top_solicitantes", "tickets_top_usuarios"].includes(g.dataset_key ?? ""));
  const grupoInventario = sortedGraficos.filter((g) => ["inventario_por_marca"].includes(g.dataset_key ?? ""));
  const grupoDistrib = sortedGraficos.filter((g) => ["distribucion_servicios", "solicitudes_programadas_vs_adicionales", "actividades_mantenimiento", "visitas_por_tipo", "mantenciones_por_status"].includes(g.dataset_key ?? ""));
  const grupoOtros = sortedGraficos.filter((g) => {
    const allGrouped = [...grupoActividad, ...grupoTickets, ...grupoInventario, ...grupoDistrib];
    return !allGrouped.some((x) => x.dataset_key === g.dataset_key);
  });

  // ── 5. Armar el documento ─────────────────────────────────────────────────
  //
  // Ya no se fuerzan saltos de página entre bloques. Con cantSplit:true cada
  // tarjeta/fila se mantiene íntegra y el contenido fluye llenando cada página.
  // Si en algún momento quieres que UNA sección específica arranque en página
  // nueva, inserta un pageBreak() puntual en ese punto.

  const children: (Table | Paragraph)[] = [

    // ── Portada ──────────────────────────────────────────────────────────────
    buildHeroPremium(titulo, subtitulo, empresaNombre, periodoTexto, logoBytes),
    spacer(70),

    // ── Panel KPI ─────────────────────────────────────────────────────────────
    // Nota: el encabezado ya NO lleva spacer() inmediatamente después; el gap
    // inferior está incorporado en el propio encabezado y keepNext lo mantiene
    // pegado al bloque siguiente.
    ...buildSectionHeader("Panel ejecutivo", "Métricas clave del período"),
    buildKpiDashboard(panelCards),
    spacer(60),

    // ── Métricas IA (si existen) ──────────────────────────────────────────────
    ...(metricasTable
      ? [
        ...buildSectionHeader("Métricas destacadas", "Indicadores Destacados"),
        metricasTable,
        spacer(60),
      ]
      : []),

    // ── Resumen ejecutivo (una sola línea de texto, sin listas) ───────────────
    ...(payload?.resumen_ejecutivo
      ? [
        ...buildSectionHeader("Resumen del período"),
        body(payload.resumen_ejecutivo),
        spacer(50),
      ]
      : []),

    // ── Bloque A: Actividad y cobertura ───────────────────────────────────────
    ...(grupoActividad.length > 0
      ? [
        ...buildSectionHeader(
          "Actividad y cobertura técnica",
          "Visitas, mantenciones presenciales y remotas"
        ),
        ...buildChartBlocks(grupoActividad),
        spacer(50),
      ]
      : []),

    // ── Bloque B: Mesa de ayuda ───────────────────────────────────────────────
    ...(grupoTickets.length > 0
      ? [
        ...buildSectionHeader(
          "Mesa de ayuda — Tickets",
          "Volumen, categorías y solicitantes frecuentes"
        ),
        ...buildChartBlocks(grupoTickets),
        spacer(80),
      ]
      : []),

    // ── Bloque C: Inventario ──────────────────────────────────────────────────
    ...(grupoInventario.length > 0 || inventarioEquiposTables.length > 0
      ? [
        ...buildSectionHeader(
          "Inventario de equipamiento",
          "Composición tecnológica y detalle operativo de activos registrados"
        ),

        ...(grupoInventario.length > 0
          ? [
            ...buildChartBlocks(grupoInventario),
            spacer(80),
          ]
          : []),

        ...(inventarioEquiposTables.length > 0
          ? [
            ...buildSectionHeader(
              "Detalle de inventario de equipos",
              "Listado de activos registrados por usuario, estado y especificaciones principales"
            ),
            ...inventarioEquiposTables.flatMap((table, index) => [
              ...(index > 0 ? [spacer(40)] : []),
              table,
            ]),
            spacer(70),
          ]
          : []),
      ]
      : []),

    // ── Bloque D: Distribución de servicios ───────────────────────────────────
    ...(grupoDistrib.length > 0
      ? [
        ...buildSectionHeader(
          "Distribución de servicios",
          "Tipos de intervención y actividades ejecutadas"
        ),
        ...buildChartBlocks(grupoDistrib),
        spacer(50),
      ]
      : []),

    // ── Bloque E: Gráficos adicionales sugeridos por IA ───────────────────────
    ...(grupoOtros.length > 0
      ? [
        ...buildSectionHeader("Análisis complementario", "Visualizaciones adicionales sugeridas"),
        ...buildChartBlocks(grupoOtros),
        spacer(80),
      ]
      : []),

    // ── Contenido adicional (Análisis y Recomendaciones) ──────────────────────
    ...(contenidoAdicional?.conclusion?.trim()
      ? [
        ...buildSectionHeader("Análisis y Recomendaciones del periodo"),
        ...buildTextParagraphs(contenidoAdicional.conclusion),
        spacer(50),
      ]
      : []),

    // ── Cierre ────────────────────────────────────────────────────────────────
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              shading: { fill: THEME.light },
              margins: { top: 100, bottom: 100, left: 200, right: 200 },
              borders: noBorders,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: `${empresaNombre} · ${periodoTexto || "Periodo"} · Asesorías RIDS Ltda.`, size: 18, color: THEME.muted }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];

  // ── 6. Generar y descargar ────────────────────────────────────────────────

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22, color: THEME.text },
        },
      },
    },
    sections: [
      {
        headers: { default: buildHeader(empresaNombre, headerLogoBytes) },
        footers: { default: buildFooter() },
        properties: {
          page: {
            margin: { top: 720, right: 700, bottom: 720, left: 700 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);

  return blob;
}

export function buildReporteIABetaFileName(
  empresaNombre: string,
  periodoTexto: string
): string {
  /*
    Nombre seguro para descargar o adjuntar el informe IA.
    Se usa tanto para descarga manual como para correo.
  */
  const safeEmpresa = empresaNombre
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "");

  const safePeriodo = (periodoTexto || "Periodo")
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "");

  return `Informe_${safeEmpresa}_${safePeriodo}.docx`;
}

export async function buildAndDownloadReporteIABetaDocx(
  params: BuildReporteIABetaDocxParams
): Promise<Blob> {
  /*
    Mantiene el comportamiento actual:
    genera el Word IA y lo descarga.
  */
  const blob = await buildReporteIABetaDocxBlob(params);

  saveAs(
    blob,
    buildReporteIABetaFileName(params.empresaNombre, params.periodoTexto)
  );

  return blob;
}