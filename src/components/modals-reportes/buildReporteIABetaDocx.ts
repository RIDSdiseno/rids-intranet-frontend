// src/components/modals-reportes/buildReporteIABetaDocx.ts
// ─── CAMBIOS respecto al original ─────────────────────────────────────────
//
//  Se eliminó desde "Narrativa consultiva" hacia abajo:
//    ✗ buildDualInsightSection (resumen + destacados de texto)
//    ✗ KPIs Interpretados (tabla de texto)
//    ✗ Aspectos Destacados (tarjetas buildHighlightCard)
//    ✗ Aspectos a Monitorear (tabla buildMonitorRowTable)
//    ✗ Acciones Recomendadas (tarjetas buildRecommendationCard)
//    ✗ Plan de Acción 30-60-90
//    ✗ Conclusión
//    ✗ Anexo Operacional completo (tablas de datos raw)
//
//  Se conservó y mejoró:
//    ✓ Portada premium (buildHeroPremium)
//    ✓ Panel ejecutivo KPI dashboard (4 métricas visuales)
//    ✓ Todos los gráficos en layout 2 columnas cuando es posible
//    ✓ Cada gráfico con badge de categoría + título + lectura ejecutiva
//    ✓ Sección de métricas destacadas de la IA (tabla compacta)
//    ✓ Header y footer de documento
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

type Params = {
  payload: PayloadIABeta;
  empresaNombre: string;
  periodoTexto: string;
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

const body = (text: string) =>
  new Paragraph({
    spacing: { after: 120, line: 320 },
    children: [new TextRun({ text: text || "—", color: THEME.text, size: 22 })],
  });

const spacer = (pts = 120) =>
  new Paragraph({ spacing: { after: pts } });

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
        children: [
          new TableCell({
            shading: { fill: "0F2B67" },
            margins: { top: 220, bottom: 220, left: 240, right: 240 },
            children: [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
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

const buildSectionHeader = (title: string, subtitle?: string) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: THEME.light },
            margins: { top: 100, bottom: 100, left: 160, right: 160 },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.SINGLE, size: 16, color: THEME.accent },
            },
            children: [
              new Paragraph({
                spacing: { after: subtitle ? 30 : 0 },
                children: [new TextRun({ text: title, bold: true, size: 28, color: THEME.primary })],
              }),
              ...(subtitle
                ? [new Paragraph({ children: [new TextRun({ text: subtitle, size: 20, color: THEME.muted })] })]
                : []),
            ],
          }),
        ],
      }),
    ],
  });

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
              transformation: { width: 560, height: 290 },
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
        children: [
          new TableCell({
            shading: { fill: style.bg },
            margins: { top: 160, bottom: 160, left: 180, right: 180 },
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
      margins: { top: 140, bottom: 140, left: 140, right: 140 },
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
                  transformation: { width: 260, height: 220 },
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

function isPieType(tipo?: string): boolean {
  const t = (tipo || "").toLowerCase();
  return t === "pie" || t === "doughnut";
}

/**
 * Organiza los gráficos en bloques:
 *   - Pie/donut consecutivos → pares en 2 columnas (más compacto)
 *   - Bar/line → ancho completo (más espacio para etiquetas)
 */
function buildChartBlocks(graficos: ChartImageItem[]): (Table | Paragraph)[] {
  const blocks: (Table | Paragraph)[] = [];
  let i = 0;

  while (i < graficos.length) {
    const current = graficos[i];
    const next = graficos[i + 1];

    if (isPieType(current.tipo) && next && isPieType(next.tipo)) {
      // Par de gráficos circulares → 2 columnas
      blocks.push(buildChartPair(current, next, i));
      blocks.push(spacer(100));
      i += 2;
    } else {
      // Gráfico de barras/línea → ancho completo
      blocks.push(buildChartCard(current, i));
      blocks.push(spacer(100));
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

function tableHeaderCellCompact(text: string): TableCell {
  return new TableCell({
    shading: { fill: THEME.primary },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 70, right: 70 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: true,
            color: "FFFFFF",
            size: 14,
          }),
        ],
      }),
    ],
  });
}

function tableCellCompact(text: string | number | null | undefined): TableCell {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 50, bottom: 50, left: 70, right: 70 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: String(text ?? "—"),
            color: THEME.text,
            size: 14,
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

function buildInventarioEquiposTable(equipos: EquipoDetalleRow[]): Table | null {
  if (!equipos.length) return null;

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

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((header) => tableHeaderCellCompact(header)),
      }),

      ...rows.map((row) =>
        new TableRow({
          children: row.map((value) => tableCellCompact(value)),
        })
      ),
    ],
  });
}

// ── Función principal ──────────────────────────────────────────────────────

export async function buildAndDownloadReporteIABetaDocx({
  payload,
  empresaNombre,
  periodoTexto,
  chartImages = [],
  mantencionesRemotas = [],
  ticketsDetalle = [],
  visitasDetalle = [],
  solicitantesDetalle = [],
  equiposDetalle = [],
  logoBytes = null,
  headerLogoBytes = null,
}: Params) {
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

  const inventarioEquiposTable = buildInventarioEquiposTable(equiposDetalle);

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

  const children: (Table | Paragraph)[] = [

    // ── Portada ──────────────────────────────────────────────────────────────
    buildHeroPremium(titulo, subtitulo, empresaNombre, periodoTexto, logoBytes),
    spacer(160),

    // ── Panel KPI ─────────────────────────────────────────────────────────────
    buildSectionHeader("Panel ejecutivo", "Métricas clave del período"),
    spacer(80),
    buildKpiDashboard(panelCards),
    spacer(140),

    // ── Métricas IA (si existen) ──────────────────────────────────────────────
    ...(metricasTable
      ? [
        buildSectionHeader("Métricas destacadas", "Indicadores Destacados"),
        spacer(80),
        metricasTable,
        spacer(140),
      ]
      : []),

    // ── Resumen ejecutivo (una sola línea de texto, sin listas) ───────────────
    ...(payload?.resumen_ejecutivo
      ? [
        buildSectionHeader("Resumen del período"),
        spacer(80),
        body(payload.resumen_ejecutivo),
        spacer(140),
      ]
      : []),

    // ── Bloque A: Actividad y cobertura ───────────────────────────────────────
    ...(grupoActividad.length > 0
      ? [
        buildSectionHeader("Actividad y cobertura técnica", "Visitas, mantenciones presenciales y remotas"),
        spacer(80),
        ...buildChartBlocks(grupoActividad),
        spacer(80),
      ]
      : []),

    // ── Bloque B: Mesa de ayuda ───────────────────────────────────────────────
    ...(grupoTickets.length > 0
      ? [
        buildSectionHeader("Mesa de ayuda — Tickets", "Volumen, categorías y solicitantes frecuentes"),
        spacer(80),
        ...buildChartBlocks(grupoTickets),
        spacer(80),
      ]
      : []),

    // ── Bloque C: Inventario ──────────────────────────────────────────────────
    ...(grupoInventario.length > 0 || inventarioEquiposTable
      ? [
        buildSectionHeader(
          "Inventario de equipamiento",
          "Composición tecnológica y detalle operativo de activos registrados"
        ),
        spacer(80),

        ...(grupoInventario.length > 0
          ? [
            ...buildChartBlocks(grupoInventario),
            spacer(80),
          ]
          : []),

        ...(inventarioEquiposTable
          ? [
            buildSectionHeader(
              "Detalle de inventario de equipos",
              "Listado de activos registrados por usuario, estado y especificaciones principales"
            ),
            spacer(80),
            inventarioEquiposTable,
            spacer(120),
          ]
          : []),
      ]
      : []),

    // ── Bloque D: Distribución de servicios ───────────────────────────────────
    ...(grupoDistrib.length > 0
      ? [
        buildSectionHeader("Distribución de servicios", "Tipos de intervención y actividades ejecutadas"),
        spacer(80),
        ...buildChartBlocks(grupoDistrib),
        spacer(80),
      ]
      : []),

    // ── Bloque E: Gráficos adicionales sugeridos por IA ───────────────────────
    ...(grupoOtros.length > 0
      ? [
        buildSectionHeader("Análisis complementario", "Visualizaciones adicionales sugeridas"),
        spacer(80),
        ...buildChartBlocks(grupoOtros),
        spacer(80),
      ]
      : []),

    // ── Cierre ────────────────────────────────────────────────────────────────
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
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
  const safeEmpresa = empresaNombre.replace(/\s+/g, "_").replace(/[^\w-]/g, "");
  const safePeriodo = (periodoTexto || "Periodo").replace(/\s+/g, "_").replace(/[^\w-]/g, "");
  saveAs(blob, `Informe_${safeEmpresa}_${safePeriodo}.docx`);
}