import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
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

type KPIItem = {
  nombre?: string;
  valor?: string | number;
  lectura?: string;
};

type HallazgoItem = {
  titulo?: string;
  detalle?: string;
  impacto?: string;
};

type RiesgoItem = {
  titulo?: string;
  detalle?: string;
  nivel?: string;
};

type RecomendacionItem = {
  prioridad?: string;
  titulo?: string;
  detalle?: string;
  beneficio?: string;
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

type PayloadIABeta = {
  layout?: {
    tipo_portada?: string;
    orden_secciones?: string[];
    estilo_general?: string;
  };
  titulo?: string;
  subtitulo?: string;
  resumen_ejecutivo?: string;
  metricas_destacadas?: MetricaDestacadaItem[];
  graficos_sugeridos?: GraficoSugeridoItem[];
  kpis_interpretados?: KPIItem[];
  hallazgos?: HallazgoItem[];
  riesgos?: RiesgoItem[];
  recomendaciones?: RecomendacionItem[];
  plan_30_60_90?: {
    d30?: string[];
    d60?: string[];
    d90?: string[];
  };
  conclusion?: string;
};

type MantencionRemotaRow = {
  id_mantencion?: number | string;
  tecnico?: { nombre?: string };
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

type ExtraTotalRow = {
  Ítem?: string;
  Cantidad?: string | number;
};

type ExtraDetalleRow = {
  Detalle?: string;
  Cantidad?: string | number;
};

type SolicitanteDetalleRow = {
  id_solicitante?: number | string | null;
  nombre?: string | null;
  email?: string | null;
};

type EquipoDetalleRow = {
  serial?: string | null;
  marca?: string | null;
  modelo?: string | null;
  ram?: string | null;
  disco?: string | null;
  propiedad?: string | null;
  idSolicitante?: number | string | null;
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
  logoBytes?: Uint8Array | null
  headerLogoBytes?: Uint8Array | null;
};

const THEME = {
  primary: "1F2937",
  accent: "2563EB",
  accentSoft: "DBEAFE",
  green: "166534",
  greenSoft: "DCFCE7",
  amber: "92400E",
  amberSoft: "FEF3C7",
  light: "F3F4F6",
  border: "E5E7EB",
  text: "0F172A",
  muted: "475569",
  zebra: "F8FAFC",
};

const h1 = (text: string) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 260, after: 120 },
    children: [new TextRun({ text, bold: true, color: THEME.primary, size: 30 })],
  });

const h2 = (text: string) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 180, after: 80 },
    children: [new TextRun({ text, bold: true, color: THEME.text, size: 24 })],
  });

const body = (text: string) =>
  new Paragraph({
    spacing: { after: 120, line: 320 },
    children: [new TextRun({ text: text || "—", color: THEME.text, size: 22 })],
  });

const bullet = (text: string) =>
  new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80, line: 300 },
    children: [new TextRun({ text, color: THEME.text, size: 22 })],
  });

const divider = () =>
  new Paragraph({
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: THEME.border },
    },
    spacing: { after: 200 },
  });

const buildHeader = (
  empresaNombre: string,
  headerLogoBytes?: Uint8Array | null
) =>
  new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 72, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    children: [
                      new TextRun({
                        text: `Informe IA Beta · ${empresaNombre}`,
                        color: THEME.muted,
                        size: 18,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 28, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: headerLogoBytes
                      ? [
                          new ImageRun({
                            data: headerLogoBytes,
                            type: "png",
                            transformation: {
                              width: 120,
                              height: 36,
                            },
                          }),
                        ]
                      : [
                          new TextRun({
                            text: "",
                          }),
                        ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 4, color: THEME.border },
        },
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
          new TextRun({
            text: "Página ",
            color: THEME.muted,
            size: 18,
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            color: THEME.muted,
            size: 18,
          }),
        ],
      }),
    ],
  });

const normalizeArray = <T,>(items: T[] | undefined, fallback: T[]): T[] =>
  items && items.length ? items : fallback;


const formatMillisecondsToReadable = (value: string | number) => {
  const raw =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/\./g, "").replace(/,/g, ""));

  if (!Number.isFinite(raw) || raw <= 0) return String(value);

  const totalMinutes = Math.round(raw / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    if (hours > 0) return `${days} d ${hours} h`;
    return `${days} d`;
  }

  if (hours > 0) {
    if (minutes > 0) return `${hours} h ${minutes} min`;
    return `${hours} h`;
  }

  return `${minutes} min`;
};

const normalizeKpiItem = (item: KPIItem): KPIItem => {
  const nombreOriginal = String(item.nombre ?? "").toLowerCase();
  const valorOriginal = item.valor ?? "—";
  const lecturaOriginal = item.lectura ?? "—";

  const isDurationMs =
    nombreOriginal.includes("duración") &&
    nombreOriginal.includes("(ms)");

  if (!isDurationMs) return item;

  const valorLegible = formatMillisecondsToReadable(valorOriginal);

  return {
    ...item,
    nombre: "Promedio duración de visita",
    valor: valorLegible,
    lectura:
      lecturaOriginal === "—" ||
      lecturaOriginal.toLowerCase().includes("ms")
        ? "Expresa el tiempo promedio de atención por visita en una unidad más legible para análisis ejecutivo."
        : lecturaOriginal,
  };
};

const buildTable = (
  headers: string[],
  rows: string[][],
  headerColor: string,
  zebraColor: string
) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(
          (t) =>
            new TableCell({
              shading: { fill: headerColor },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: t, bold: true, color: "FFFFFF", size: 20 })],
                }),
              ],
            })
        ),
      }),
      ...rows.map(
        (row, index) =>
          new TableRow({
            children: row.map(
              (value) =>
                new TableCell({
                  shading: { fill: index % 2 === 0 ? zebraColor : "FFFFFF" },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: value, color: THEME.text, size: 20 })],
                    }),
                  ],
                })
            ),
          })
      ),
    ],
  });

const buildKpiTable = (items: KPIItem[] = []) =>
  buildTable(
    ["Indicador", "Valor", "Lectura ejecutiva"],
    normalizeArray(items, [
      { nombre: "Indicador", valor: "—", lectura: "Sin información disponible." },
    ])
      .map(normalizeKpiItem)
      .map((item) => [
        item.nombre ?? "—",
        String(item.valor ?? "—"),
        item.lectura ?? "—",
      ]),
    THEME.primary,
    THEME.zebra
  );

const buildMetricasDestacadasTable = (items: MetricaDestacadaItem[] = []) =>
  buildTable(
    ["Métrica destacada", "Valor", "Lectura ejecutiva"],
    normalizeArray(items, [
      {
        nombre: "Métrica",
        valor: "—",
        lectura: "No se definieron métricas destacadas para este periodo.",
      },
    ]).map((item) => [
      item.nombre ?? "—",
      String(item.valor ?? "—"),
      item.lectura ?? "—",
    ]),
    THEME.accent,
    THEME.accentSoft
  );

 const buildSimpleInfoCard = (
  titulo: string,
  detalle: string,
  etiqueta?: string,
  etiquetaColor?: string,
  background = "FFFFFF"
  ) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: background },
            margins: { top: 120, bottom: 120, left: 140, right: 140 },
            children: [
              new Paragraph({
                spacing: { after: 50 },
                children: [
                  new TextRun({
                    text: titulo,
                    bold: true,
                    size: 24,
                    color: THEME.primary,
                  }),
                ],
              }),
              ...(etiqueta
                ? [
                    new Paragraph({
                      spacing: { after: 50 },
                      children: [
                        new TextRun({
                          text: etiqueta,
                          bold: true,
                          size: 20,
                          color: etiquetaColor || THEME.accent,
                        }),
                      ],
                    }),
                  ]
                : []),
              new Paragraph({
                children: [
                  new TextRun({
                    text: detalle,
                    size: 20,
                    color: THEME.text,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });


const compactText = (value?: string | number | null) =>
  String(value ?? "—").replace(/\s+/g, " ").trim() || "—";

const buildSectionKicker = (title: string, rightText?: string) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            children: [
              new Paragraph({
                spacing: { after: 40 },
                children: [new TextRun({ text: title, bold: true, size: 34, color: THEME.primary })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 40 },
                children: [new TextRun({ text: rightText || "", size: 20, color: THEME.muted })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

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
                      new TableCell({
                        width: { size: 58, type: WidthType.PERCENTAGE },
                        borders: {
                          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                          bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                        },
                        children: [
                          ...(logoBytes
                            ? [
                                new Paragraph({
                                  spacing: { after: 70 },
                                  children: [
                                    new ImageRun({
                                      data: logoBytes,
                                      type: "png",
                                      transformation: { width: 170, height: 52 },
                                    }),
                                  ],
                                }),
                              ]
                            : []),
                          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "ASESORÍAS RIDS · REPORTE PREMIUM CON IA", bold: true, size: 18, color: "DCE7FF" })] }),
                          new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: titulo, bold: true, size: 42, color: "FFFFFF" })] }),
                          new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: subtitulo, size: 24, color: "E2E8F0" })] }),
                          new Paragraph({ children: [new TextRun({ text: `${empresaNombre} · Periodo ${periodoTexto || "No definido"}`, bold: true, size: 22, color: "FFFFFF" })] }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 42, type: WidthType.PERCENTAGE },
                        borders: {
                          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                          bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                        },
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
                                      new Paragraph({ spacing: { after: 45 }, children: [new TextRun({ text: "Versión: Informe IA Beta", size: 20, color: "FFFFFF" })] }),
                                      new Paragraph({ children: [new TextRun({ text: "Generado a partir de datos reales del sistema y narrativa asistida por IA.", size: 18, color: "E2E8F0" })] }),
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

const buildDualInsightSection = (resumen: string, destacados: string[]) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 58, type: WidthType.PERCENTAGE },
            shading: { fill: "FFFFFF" },
            margins: { top: 180, bottom: 180, left: 180, right: 180 },
            children: [
              new Paragraph({ spacing: { after: 70 }, children: [new TextRun({ text: "RESUMEN EJECUTIVO GENERADO CON IA", bold: true, size: 24, color: THEME.accent })] }),
              new Paragraph({ spacing: { after: 40, line: 340 }, children: [new TextRun({ text: resumen || "Sin resumen ejecutivo disponible.", size: 24, color: THEME.text })] }),
            ],
          }),
          new TableCell({
            width: { size: 42, type: WidthType.PERCENTAGE },
            shading: { fill: "FFFFFF" },
            margins: { top: 180, bottom: 180, left: 180, right: 180 },
            children: [
              new Paragraph({ spacing: { after: 70 }, children: [new TextRun({ text: "DESTACADOS DEL PERIODO", bold: true, size: 24, color: THEME.muted })] }),
              ...destacados.map((item) =>
                new Paragraph({
                  bullet: { level: 0 },
                  spacing: { after: 60, line: 320 },
                  children: [new TextRun({ text: item, size: 22, color: THEME.text })],
                })
              ),
            ],
          }),
        ],
      }),
    ],
  });

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

 // word IA

 const getImpactFill = (impacto?: string) => {
  const v = String(impacto || "").toLowerCase();
  if (v === "alto") return THEME.greenSoft;
  if (v === "medio") return THEME.accentSoft;
  return THEME.light;
};

const getMonitorFill = (nivel?: string) => {
  const v = String(nivel || "").toLowerCase();
  if (v === "alto") return "FDE68A";
  if (v === "medio") return THEME.amberSoft;
  return THEME.light;
};

const getPriorityFill = (prioridad?: string) => {
  const v = String(prioridad || "").toLowerCase();
  if (v === "alta") return THEME.accentSoft;
  if (v === "media") return THEME.light;
  return "F3F4F6";
};

const getPriorityColor = (prioridad?: string) => {
  const v = String(prioridad || "").toLowerCase();
  if (v === "alta") return THEME.accent;
  if (v === "media") return THEME.green;
  return THEME.muted;
};

const buildHighlightCard = (
  titulo: string,
  detalle: string,
  impacto?: string
) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: getImpactFill(impacto) },
            margins: { top: 120, bottom: 120, left: 140, right: 140 },
            children: [
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: titulo,
                    bold: true,
                    size: 24,
                    color: THEME.primary,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 45 },
                children: [
                  new TextRun({
                    text: `Impacto: ${impacto || "No definido"}`,
                    bold: true,
                    size: 20,
                    color: THEME.green,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: detalle,
                    size: 20,
                    color: THEME.text,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

const buildMonitorRowTable = (
  items: { titulo?: string; detalle?: string; nivel?: string }[]
) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: ["Aspecto", "Detalle", "Nivel"].map(
          (t) =>
            new TableCell({
              shading: { fill: THEME.amber },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: t,
                      bold: true,
                      color: "FFFFFF",
                      size: 20,
                    }),
                  ],
                }),
              ],
            })
        ),
      }),
      ...items.map(
        (r) =>
          new TableRow({
            children: [
              r.titulo || "Aspecto a monitorear",
              r.detalle || "Sin detalle disponible.",
              r.nivel || "No definido",
            ].map(
              (value, index) =>
                new TableCell({
                  shading: {
                    fill:
                      index === 2
                        ? getMonitorFill(r.nivel)
                        : getMonitorFill(r.nivel),
                  },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: value,
                          color: THEME.text,
                          size: 20,
                          bold: index === 2,
                        }),
                      ],
                    }),
                  ],
                })
            ),
          })
      ),
    ],
  });



const buildRecommendationCard = (
  prioridad: string,
  titulo: string,
  detalle: string,
  beneficio?: string
) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: getPriorityFill(prioridad) },
            margins: { top: 140, bottom: 140, left: 160, right: 160 },
            children: [
              new Paragraph({
                spacing: { after: 50 },
                children: [
                  new TextRun({
                    text: titulo,
                    bold: true,
                    size: 24,
                    color: THEME.primary,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: `Prioridad ${prioridad}`,
                    bold: true,
                    size: 20,
                    color: getPriorityColor(prioridad),
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 55, line: 320 },
                children: [
                  new TextRun({
                    text: detalle,
                    size: 20,
                    color: THEME.text,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 20 },
                children: [
                  new TextRun({
                    text: "Beneficio esperado: ",
                    bold: true,
                    size: 20,
                    color: THEME.muted,
                  }),
                  new TextRun({
                    text: beneficio || "No informado",
                    italics: true,
                    size: 20,
                    color: THEME.muted,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });






 const datasetKeyLabel = (key?: string) => {
  switch (key) {
    case "mantenciones_por_fecha":
      return "Mantenciones por fecha";
    case "distribucion_servicios":
      return "Distribución de servicios";
    case "solicitudes_programadas_vs_adicionales":
      return "Solicitudes programadas vs adicionales";
    case "actividades_mantenimiento":
      return "Actividades de mantenimiento";
    case "tickets_por_categoria":
      return "Tickets por categoría";
    case "tickets_top_usuarios":
      return "Top usuarios por tickets";
    case "visitas_por_tecnico":
      return "Visitas por técnico";
    case "visitas_por_tipo":
      return "Visitas por tipo";
    case "mantenciones_por_status":
      return "Mantenciones por estado";
    case "mantenciones_por_tecnico":
      return "Mantenciones por técnico";
    case "inventario_por_marca":
      return "Inventario por marca";
    default:
      return key || "Dataset no especificado";
  }
};

const getChartVisualStyle = (datasetKey?: string, index = 0) => {
  const byDataset: Record<string, { bg: string; accent: string; badge: string }> = {
    mantenciones_por_fecha: { bg: "EEF6FF", accent: "2563EB", badge: "Tendencia operacional" },
    distribucion_servicios: { bg: "ECFDF5", accent: "059669", badge: "Distribución del servicio" },
    solicitudes_programadas_vs_adicionales: { bg: "F5F3FF", accent: "7C3AED", badge: "Planificado vs adicional" },
    actividades_mantenimiento: { bg: "FFF7ED", accent: "EA580C", badge: "Actividad preventiva" },
    inventario_por_marca: { bg: "FEF2F2", accent: "DC2626", badge: "Composición tecnológica" },
    tickets_por_categoria: { bg: "EEF2FF", accent: "4F46E5", badge: "Mesa de ayuda" },
    tickets_top_usuarios: { bg: "ECFDF5", accent: "16A34A", badge: "Focos de demanda" },
    visitas_por_tecnico: { bg: "EFF6FF", accent: "0284C7", badge: "Cobertura en terreno" },
    visitas_por_tipo: { bg: "FDF4FF", accent: "C026D3", badge: "Tipo de visita" },
    mantenciones_por_status: { bg: "FEFCE8", accent: "CA8A04", badge: "Estado de ejecución" },
    mantenciones_por_tecnico: { bg: "ECFEFF", accent: "0891B2", badge: "Carga por técnico" },
  };

  const fallback = [
    { bg: "EEF6FF", accent: "2563EB", badge: "Visual ejecutivo" },
    { bg: "ECFDF5", accent: "059669", badge: "Visual ejecutivo" },
    { bg: "F5F3FF", accent: "7C3AED", badge: "Visual ejecutivo" },
    { bg: "FFF7ED", accent: "EA580C", badge: "Visual ejecutivo" },
  ];

  return datasetKey && byDataset[datasetKey]
    ? byDataset[datasetKey]
    : fallback[index % fallback.length];
};

const chartTypeLabel = (tipo?: string) => {
  switch ((tipo || "").toLowerCase()) {
    case "bar":
      return "Gráfico de barras";
    case "pie":
      return "Gráfico circular";
    case "doughnut":
      return "Gráfico de dona";
    case "horizontalbar":
      return "Gráfico de barras horizontales";
    default:
      return tipo || "Gráfico";
  }
};

const formatDateTimeCL = (value?: string | Date | null) => {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("es-CL");
  } catch {
    return "—";
  }
};

const formatDateCL = (value?: string | Date | null) => {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-CL");
  } catch {
    return "—";
  }
};

const formatTimeRangeCL = (
  inicio?: string | Date | null,
  fin?: string | Date | null
) => {
  if (!inicio || !fin) return "—";
  try {
    const i = new Date(inicio);
    const f = new Date(fin);
    if (Number.isNaN(i.getTime()) || Number.isNaN(f.getTime())) return "—";
    return `${i.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${f.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch {
    return "—";
  }
};

const truncate = (text: string, max: number) =>
  text.length > max ? text.slice(0, max - 3) + "..." : text;


const buildSolicitanteNameMap = (solicitantes: SolicitanteDetalleRow[] = []) => {
  const map = new Map<string, string>();
  solicitantes.forEach((s) => {
    if (s.id_solicitante !== undefined && s.id_solicitante !== null) {
      map.set(String(s.id_solicitante), s.nombre ?? "");
    }
  });
  return map;
};


const buildChartSection = (grafico: ChartImageItem, index: number) => {
  const visual = getChartVisualStyle(grafico.dataset_key, index);

  const children: Paragraph[] = [
    new Paragraph({
      spacing: { after: 45 },
      children: [
        new TextRun({
          text: visual.badge,
          bold: true,
          size: 18,
          color: visual.accent,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: grafico.titulo || "Visualización sugerida",
          bold: true,
          size: 24,
          color: THEME.primary,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 55 },
      children: [
        new TextRun({
          text: `${chartTypeLabel(grafico.tipo)} · ${datasetKeyLabel(grafico.dataset_key)}`,
          bold: true,
          size: 20,
          color: visual.accent,
        }),
      ],
    }),
  ];

  if (grafico.imageBytes) {
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: grafico.imageBytes,
            type: "png",
            transformation: {
              width: 520,
              height: 280,
            },
          }),
        ],
      })
    );
  } else {
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "Gráfico no disponible para este periodo.",
            italics: true,
            size: 20,
            color: THEME.muted,
          }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      spacing: { after: 20 },
      children: [
        new TextRun({
          text: grafico.lectura || "Sin lectura ejecutiva disponible.",
          size: 20,
          color: THEME.text,
        }),
      ],
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: visual.bg },
            margins: { top: 140, bottom: 140, left: 160, right: 160 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: visual.accent },
              right: { style: BorderStyle.SINGLE, size: 4, color: THEME.border },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: THEME.border },
              left: { style: BorderStyle.SINGLE, size: 4, color: THEME.border },
            },
            children,
          }),
        ],
      }),
    ],
  });
};

export async function buildAndDownloadReporteIABetaDocx({
  payload,
  empresaNombre,
  periodoTexto,
  chartImages = [],
  mantencionesRemotas = [],
  ticketsDetalle = [],
  visitasDetalle = [],
  extrasTotales = [],
  extrasDetalle = [],
  solicitantesDetalle = [],
  equiposDetalle = [],
  logoBytes = null,
  headerLogoBytes = null,
}: Params) {
  const titulo = payload?.titulo || "Informe Ejecutivo de Operaciones TI";
  const subtitulo =
    payload?.subtitulo || "Versión Ejecutivo";

  const metricasDestacadas = normalizeArray(payload?.metricas_destacadas, [
    {
      nombre: "Métrica destacada",
      valor: "—",
      lectura: "No se definieron métricas destacadas para este periodo.",
    },
  ]);

  const graficosBase = normalizeArray(payload?.graficos_sugeridos, [
    {
      tipo: "bar",
      titulo: "Visualización sugerida",
      dataset_key: "tickets_por_categoria",
      lectura: "No se definieron gráficos sugeridos para este periodo.",
    },
  ]);

  const graficosSugeridos: ChartImageItem[] = graficosBase.map((g) => {
    const found = chartImages.find((c) => c.dataset_key === g.dataset_key);
    return {
      ...g,
      imageBytes: found?.imageBytes ?? null,
    };
  });

  const hallazgos = normalizeArray(payload?.hallazgos, [
    {
      titulo: "Aspecto destacado del periodo",
      detalle: "No se identificaron aspectos destacados adicionales.",
      impacto: "Bajo",
    },
  ]);

  const riesgos = normalizeArray(payload?.riesgos, [
    {
      titulo: "Aspecto a monitorear",
      detalle: "No se identificaron aspectos a monitorear adicionales.",
      nivel: "Bajo",
    },
  ]);

  const recomendaciones = normalizeArray(payload?.recomendaciones, [
    {
      prioridad: "Media",
      titulo: "Acción recomendada",
      detalle: "No se definieron acciones adicionales para este periodo.",
      beneficio: "Mantener seguimiento y continuidad del servicio.",
    },
  ]);

  const d30 = normalizeArray(payload?.plan_30_60_90?.d30, [
    "Mantener seguimiento periódico de la operación.",
  ]);
  const d60 = normalizeArray(payload?.plan_30_60_90?.d60, [
    "Consolidar acciones de mejora continua.",
  ]);
  const d90 = normalizeArray(payload?.plan_30_60_90?.d90, [
    "Evaluar resultados y próximos focos de fortalecimiento.",
  ]);

  const mantencionesRows = normalizeArray(
    mantencionesRemotas.map((m) => ({
      ID: String(m.id_mantencion ?? "—"),
      Técnico: m.tecnico?.nombre ?? "—",
      Inicio: formatDateTimeCL(m.inicio),
      Fin: formatDateTimeCL(m.fin),
      Estado: String(m.status ?? "—").toUpperCase(),
      Usuario: m.solicitante ?? "—",
    })),
    [
      {
        ID: "—",
        Técnico: "—",
        Inicio: "—",
        Fin: "—",
        Estado: "—",
        Usuario: "—",
      },
    ]
  );

  const ticketsRows = normalizeArray(
    ticketsDetalle.map((t) => ({
      ID: String(t.ticket_id ?? "—"),
      Asunto: t.subject ?? "—",
      Estado: "Cerrado",
      Categoría: t.type ?? "—",
      Fecha: formatDateTimeCL(t.fecha),
    })),
    [
      {
        ID: "—",
        Asunto: "—",
        Estado: "—",
        Categoría: "—",
        Fecha: "—",
      },
    ]
  );

  const visitasRows = normalizeArray(
    visitasDetalle.map((v) => ({
      Técnico: truncate(v.tecnico?.nombre ?? "—", 20),
      Fecha: formatDateCL(v.inicio),
      Horario: formatTimeRangeCL(v.inicio, v.fin),
      Usuario: truncate(
        v.solicitante ?? v.solicitanteRef?.nombre ?? "—",
        25
      ),
      Estado: truncate(String(v.status ?? "—").toUpperCase(), 15),
    })),
    [
      {
        Técnico: "—",
        Fecha: "—",
        Horario: "—",
        Usuario: "—",
        Estado: "—",
      },
    ]
  );

  const extrasTotalesRows = normalizeArray(
    extrasTotales.map((r) => ({
      Ítem: String(r.Ítem ?? "—"),
      Cantidad: String(r.Cantidad ?? "0"),
    })),
    [
      {
        Ítem: "—",
        Cantidad: "0",
      },
    ]
  );

  const extrasDetalleRows = normalizeArray(
    (extrasDetalle.length ? extrasDetalle : [{ Detalle: "—", Cantidad: 0 }]).map((r) => ({
      "Detalle otros": String(r.Detalle ?? "—"),
      Cantidad: String(r.Cantidad ?? "0"),
    })),
    [
      {
        "Detalle otros": "—",
        Cantidad: "0",
      },
    ]
  );

  const correosRows = normalizeArray(
    solicitantesDetalle.map((s, index) => ({
      "#": String(index + 1),
      Nombre: s.nombre ?? "",
      Correo: s.email ?? "",
    })),
    [
      {
        "#": "1",
        Nombre: "—",
        Correo: "—",
      },
    ]
  );

  const solicitanteNameMap = buildSolicitanteNameMap(solicitantesDetalle);

  const inventarioRows = normalizeArray(
    equiposDetalle.map((e) => ({
      Serial: e.serial ?? "",
      Marca: e.marca ?? "",
      Modelo: e.modelo ?? "",
      RAM: e.ram ?? "",
      Disco: e.disco ?? "",
      Propiedad: e.propiedad ?? "",
      Solicitante:
        e.idSolicitante !== undefined && e.idSolicitante !== null
          ? solicitanteNameMap.get(String(e.idSolicitante)) ?? ""
          : "",
    })),
    [
      {
        Serial: "—",
        Marca: "—",
        Modelo: "—",
        RAM: "—",
        Disco: "—",
        Propiedad: "—",
        Solicitante: "—",
      },
    ]
  );

  const resumenCorto = payload?.resumen_ejecutivo || "Sin resumen ejecutivo disponible.";

  const destacadosPeriodo = [
    metricasDestacadas[0]
      ? `${compactText(metricasDestacadas[0].valor)} ${compactText(metricasDestacadas[0].nombre).toLowerCase()} durante el periodo.`
      : null,
    metricasDestacadas[1]
      ? `${compactText(metricasDestacadas[1].valor)} ${compactText(metricasDestacadas[1].nombre).toLowerCase()}.`
      : null,
    metricasDestacadas[3]
      ? `${compactText(metricasDestacadas[3].valor)} activos inventariados bajo seguimiento operativo.`
      : null,
    hallazgos[0]?.detalle ? compactText(hallazgos[0].detalle) : null,
  ].filter(Boolean) as string[];

  const panelCards = [
    {
      label: "TICKETS",
      value: String(ticketsDetalle.length || payload?.metricas_destacadas?.find((m) => compactText(m.nombre).toLowerCase().includes("ticket"))?.valor || "0"),
      helper: "Incidencias atendidas",
      fill: "E8F0FF",
      accent: "2563EB",
    },
    {
      label: "MANTENCIONES REMOTAS",
      value: String(mantencionesRemotas.length || payload?.metricas_destacadas?.find((m) => compactText(m.nombre).toLowerCase().includes("mantencion"))?.valor || "0"),
      helper: "Cierre operativo del periodo",
      fill: "E7F7EF",
      accent: "059669",
    },
    {
      label: "USUARIOS ACTIVOS",
      value: String(solicitantesDetalle.length || "0"),
      helper: "Base considerada",
      fill: "F1EAFE",
      accent: "7C3AED",
    },
    {
      label: "INVENTARIO",
      value: String(equiposDetalle.length || payload?.metricas_destacadas?.find((m) => compactText(m.nombre).toLowerCase().includes("inventario"))?.valor || "0"),
      helper: "Activos inventariados",
      fill: "FFF4E6",
      accent: "D97706",
    },
  ];

  const children = [
    buildHeroPremium(titulo, subtitulo, empresaNombre, periodoTexto, logoBytes),
    new Paragraph({ spacing: { after: 140 } }),
    buildDualInsightSection(
      resumenCorto,
      normalizeArray(destacadosPeriodo, ["Sin destacados ejecutivos disponibles para este periodo."])
    ),
    new Paragraph({ spacing: { after: 140 } }),
    buildSectionKicker("Panel ejecutivo", "KPIs operativos del periodo"),
    buildKpiDashboard(panelCards),
    new Paragraph({ spacing: { after: 140 } }),
    buildSectionKicker("Análisis visual", "Visualizaciones para jefatura"),
    body(
      "Las siguientes visualizaciones consolidan los principales comportamientos operativos del periodo y facilitan una lectura rápida para jefatura y clientes."
    ),
    ...graficosSugeridos.flatMap((grafico, index) => [
      buildChartSection(grafico, index),
      new Paragraph({ spacing: { after: 80 } }),
    ]),

    buildSectionKicker("Narrativa consultiva", "Contenido ejecutivo + IA"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { fill: "FFFFFF" },
              margins: { top: 160, bottom: 160, left: 160, right: 160 },
              children: [
                new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: "Análisis operativo", bold: true, size: 24, color: THEME.primary })] }),
                new Paragraph({ spacing: { after: 40, line: 320 }, children: [new TextRun({ text: hallazgos[0]?.detalle || resumenCorto, size: 22, color: THEME.text })] }),
                new Paragraph({ spacing: { after: 40, line: 320 }, children: [new TextRun({ text: payload?.conclusion || "Sin contexto adicional disponible.", size: 22, color: THEME.text })] }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { fill: "FFFFFF" },
              margins: { top: 160, bottom: 160, left: 160, right: 160 },
              children: [
                new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: "Contexto del servicio", bold: true, size: 24, color: THEME.primary })] }),
                new Paragraph({ spacing: { after: 40, line: 320 }, children: [new TextRun({ text: `Este documento compila el trabajo operativo ejecutado para ${empresaNombre}, integrando atención de tickets, visitas técnicas, mantenciones remotas y control de inventario durante ${periodoTexto || "el periodo seleccionado"}.`, size: 22, color: THEME.text })] }),
                new Paragraph({ spacing: { after: 40, line: 320 }, children: [new TextRun({ text: `La operación considera ${solicitantesDetalle.length || 0} usuarios activos y ${equiposDetalle.length || 0} activos inventariados bajo seguimiento operativo.`, size: 22, color: THEME.text })] }),
              ],
            }),
          ],
        }),
      ],
    }),

    h1("KPIs Interpretados"),
    body(
      "La siguiente tabla resume indicadores del periodo con una lectura ejecutiva orientada a continuidad operacional, acompañamiento técnico y valor del servicio."
    ),
    buildKpiTable(payload?.kpis_interpretados || []),

    h1("Aspectos Destacados del Periodo"),
    body(
      "A continuación se resumen los principales resultados y focos positivos observados durante el periodo, destacados en formato ejecutivo para facilitar su lectura."
    ),
    ...hallazgos.flatMap((h) => [
      buildHighlightCard(
        h.titulo || "Aspecto destacado",
        h.detalle || "Sin detalle disponible.",
        h.impacto || "Bajo"
      ),
      new Paragraph({ spacing: { after: 80 } }),
    ]),

    h1("Aspectos a Monitorear"),
    body(
      "Los siguientes puntos se presentan como focos de atención y oportunidades de fortalecimiento, desde una lógica de mejora continua y evolución del servicio."
    ),
    buildMonitorRowTable(
      riesgos.map((r) => ({
        titulo: r.titulo || "Aspecto a monitorear",
        detalle: r.detalle || "Sin detalle disponible.",
        nivel: r.nivel || "No definido",
      }))
    ),

    h1("Acciones Recomendadas de Fortalecimiento"),
    body(
      "Estas acciones se proponen para seguir fortaleciendo la operación, mejorar trazabilidad y consolidar oportunidades detectadas durante el periodo."
    ),
    ...recomendaciones.flatMap((r, index) => [
    buildRecommendationCard(
      r.prioridad || "Media",
      `${index + 1}. ${r.titulo || "Recomendación"}`,
      r.detalle || "Sin detalle disponible.",
      r.beneficio || "No informado"
    ),
     new Paragraph({ spacing: { after: 90 } }),
    ]),

    h1("Plan de Acción 30-60-90"),
    h2("30 días"),
    ...d30.map(bullet),
    h2("60 días"),
    ...d60.map(bullet),
    h2("90 días"),
    ...d90.map(bullet),

    h1("Conclusión"),
    body(payload?.conclusion || "Sin conclusión disponible."),

    new Paragraph({
      children: [new PageBreak()],
    }),

    h1("Anexo Operacional"),
    body(
      "A continuación se incorpora el detalle operacional completo del periodo, con el fin de respaldar la información ejecutiva presentada previamente."
    ),

    h2(`Mantenciones Remotas — ${empresaNombre} (${periodoTexto || "Periodo"})`),
    body(
      `Durante el periodo ${periodoTexto || "seleccionado"} se ejecutaron ${mantencionesRemotas.length} mantenciones remotas.`
    ),
    buildTable(
      ["ID", "Técnico", "Inicio", "Fin", "Estado", "Usuario"],
      mantencionesRows.map((r) => [
        r.ID,
        r.Técnico,
        r.Inicio,
        r.Fin,
        r.Estado,
        r.Usuario,
      ]),
      THEME.primary,
      THEME.zebra
    ),

    h2("Tickets"),
    buildTable(
      ["ID", "Asunto", "Estado", "Categoría", "Fecha"],
      ticketsRows.map((r) => [
        r.ID,
        r.Asunto,
        r.Estado,
        r.Categoría,
        r.Fecha,
      ]),
      THEME.primary,
      THEME.zebra
    ),

    h2("Visitas Técnicas"),
    buildTable(
      ["Técnico", "Fecha", "Horario", "Usuario", "Estado"],
      visitasRows.map((r) => [
        r.Técnico,
        r.Fecha,
        r.Horario,
        r.Usuario,
        r.Estado,
      ]),
      THEME.primary,
      THEME.zebra
    ),

    h2("Configuraciones y Otros (totales)"),
    buildTable(
      ["Ítem", "Cantidad"],
      extrasTotalesRows.map((r) => [r.Ítem, r.Cantidad]),
      THEME.primary,
      THEME.zebra
    ),

    h2('Detalle de "Otros"'),
    buildTable(
      ["Detalle otros", "Cantidad"],
      extrasDetalleRows.map((r) => [r["Detalle otros"], r.Cantidad]),
      THEME.primary,
      THEME.zebra
    ),

    h2("Usuarios y Correos activos"),
    buildTable(
      ["#", "Nombre", "Correo"],
      correosRows.map((r) => [r["#"], r.Nombre, r.Correo]),
      THEME.primary,
      THEME.zebra
    ),

    h2("Inventario de Equipamiento"),
    buildTable(
      ["Serial", "Marca", "Modelo", "RAM", "Disco", "Propiedad", "Solicitante"],
      inventarioRows.map((r) => [
        r.Serial,
        r.Marca,
        r.Modelo,
        r.RAM,
        r.Disco,
        r.Propiedad,
        r.Solicitante,
      ]),
      THEME.primary,
      THEME.zebra
    ),
  ];

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 22,
            color: THEME.text,
          },
        },
      },
    },
    sections: [
      {
        headers: { default: buildHeader(empresaNombre, headerLogoBytes) },
        footers: { default: buildFooter() },
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeEmpresa = empresaNombre.replace(/\s+/g, "_").replace(/[^\w-]/g, "");
  const safePeriodo = (periodoTexto || "Periodo")
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "");
  saveAs(blob, `Informe_IA_Beta_${safeEmpresa}_${safePeriodo}.docx`);
}