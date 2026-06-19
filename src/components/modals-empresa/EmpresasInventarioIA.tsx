import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Button,
    Card,
    Col,
    DatePicker,
    Empty,
    Row,
    Select,
    Spin,
    Statistic,
    Tag,
    message,
} from "antd";
import {
    DownloadOutlined,
    FileSearchOutlined,
    RobotOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { http } from "../../service/http";

type EmpresaOption = {
    id_empresa: number;
    nombre: string;
};

type HallazgoIA = {
    severidad: "ALTA" | "MEDIA" | "BAJA";
    descripcion: string;
};

type AnalisisInventarioIA = {
    resumen: string;
    hallazgos: HallazgoIA[];
    riesgos?: string[];
    recomendaciones: string[];
};

type InventarioIAResponse = {
    empresaId: number;
    totalEquipos: number;
    analisis: AnalisisInventarioIA;
};

const getSeveridadAlertType = (severidad: string) => {
    if (severidad === "ALTA") return "error";
    if (severidad === "MEDIA") return "warning";
    return "info";
};

const getSeveridadColor = (severidad: string) => {
    if (severidad === "ALTA") return "red";
    if (severidad === "MEDIA") return "orange";
    return "blue";
};

const normalizarNombreArchivo = (value: string) => {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();
};

const prepararNodoParaPdf = (root: HTMLElement) => {
    root.style.backgroundColor = "#ffffff";
    root.style.color = "#0f172a";

    const all = root.querySelectorAll<HTMLElement>("*");

    all.forEach((el) => {
        const computed = window.getComputedStyle(el);

        const color = computed.color;
        const backgroundColor = computed.backgroundColor;
        const borderColor = computed.borderColor;

        if (color.includes("oklch")) {
            el.style.color = "#0f172a";
        }

        if (backgroundColor.includes("oklch")) {
            el.style.backgroundColor = "#ffffff";
        }

        if (borderColor.includes("oklch")) {
            el.style.borderColor = "#e2e8f0";
        }

        el.style.boxShadow = "none";
    });

    const cards = root.querySelectorAll<HTMLElement>(".ant-card");

    cards.forEach((card) => {
        card.style.backgroundColor = "#ffffff";
        card.style.borderColor = "#e2e8f0";
        card.style.boxShadow = "none";
    });

    const alerts = root.querySelectorAll<HTMLElement>(".ant-alert");

    alerts.forEach((alert) => {
        alert.style.backgroundColor = "#ffffff";
        alert.style.borderColor = "#e2e8f0";
    });

    const tags = root.querySelectorAll<HTMLElement>(".ant-tag");

    tags.forEach((tag) => {
        tag.style.backgroundColor = "#f8fafc";
        tag.style.borderColor = "#cbd5e1";
        tag.style.color = "#334155";
    });
};

type JsPdfDoc = InstanceType<typeof jsPDF>;

const PDF_COLORS = {
    primary: [15, 23, 42] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
    border: [226, 232, 240] as [number, number, number],
    lightBg: [248, 250, 252] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    red: [220, 38, 38] as [number, number, number],
    orange: [217, 119, 6] as [number, number, number],
    blue: [37, 99, 235] as [number, number, number],
};

const setTextColor = (pdf: JsPdfDoc, color: [number, number, number]) => {
    pdf.setTextColor(color[0], color[1], color[2]);
};

const setDrawColor = (pdf: JsPdfDoc, color: [number, number, number]) => {
    pdf.setDrawColor(color[0], color[1], color[2]);
};

const setFillColor = (pdf: JsPdfDoc, color: [number, number, number]) => {
    pdf.setFillColor(color[0], color[1], color[2]);
};

const sanitizePdfText = (value: unknown) => {
    return String(value ?? "-")
        .replace(/\s+/g, " ")
        .replace(/[^\S\r\n]+/g, " ")
        .trim();
};

const getSeverityPdfColor = (severidad?: string): [number, number, number] => {
    if (severidad === "ALTA") return PDF_COLORS.red;
    if (severidad === "MEDIA") return PDF_COLORS.orange;
    return PDF_COLORS.blue;
};

const addPageIfNeeded = (
    pdf: JsPdfDoc,
    y: number,
    neededHeight: number,
    margin: number
) => {
    const pageHeight = pdf.internal.pageSize.getHeight();

    if (y + neededHeight <= pageHeight - margin) {
        return y;
    }

    pdf.addPage();
    return margin;
};

const drawSectionTitle = (
    pdf: JsPdfDoc,
    title: string,
    y: number,
    margin: number,
    contentWidth: number
) => {
    y = addPageIfNeeded(pdf, y, 14, margin);

    setFillColor(pdf, PDF_COLORS.lightBg);
    setDrawColor(pdf, PDF_COLORS.border);
    pdf.roundedRect(margin, y, contentWidth, 10, 2, 2, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    setTextColor(pdf, PDF_COLORS.primary);
    pdf.text(title, margin + 4, y + 6.5);

    return y + 15;
};

const drawWrappedParagraph = (
    pdf: JsPdfDoc,
    text: string,
    y: number,
    margin: number,
    contentWidth: number,
    options?: {
        fontSize?: number;
        fontStyle?: "normal" | "bold";
        lineHeight?: number;
        color?: [number, number, number];
    }
) => {
    const fontSize = options?.fontSize ?? 10;
    const lineHeight = options?.lineHeight ?? 5.2;

    pdf.setFont("helvetica", options?.fontStyle ?? "normal");
    pdf.setFontSize(fontSize);
    setTextColor(pdf, options?.color ?? PDF_COLORS.primary);

    const lines = pdf.splitTextToSize(sanitizePdfText(text), contentWidth);
    const neededHeight = lines.length * lineHeight;

    y = addPageIfNeeded(pdf, y, neededHeight, margin);

    pdf.text(lines, margin, y);

    return y + neededHeight + 2;
};

const drawInfoCard = (
    pdf: JsPdfDoc,
    label: string,
    value: string | number,
    x: number,
    y: number,
    width: number,
    height: number
) => {
    setFillColor(pdf, PDF_COLORS.white);
    setDrawColor(pdf, PDF_COLORS.border);
    pdf.roundedRect(x, y, width, height, 2, 2, "FD");

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    setTextColor(pdf, PDF_COLORS.muted);
    pdf.text(label, x + 4, y + 6);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    setTextColor(pdf, PDF_COLORS.primary);

    const valueLines = pdf.splitTextToSize(sanitizePdfText(value), width - 8);
    pdf.text(valueLines.slice(0, 2), x + 4, y + 13);
};

const drawBulletList = (
    pdf: JsPdfDoc,
    items: string[],
    y: number,
    margin: number,
    contentWidth: number
) => {
    if (!items.length) {
        return drawWrappedParagraph(
            pdf,
            "Sin registros.",
            y,
            margin,
            contentWidth,
            {
                color: PDF_COLORS.muted,
            }
        );
    }

    items.forEach((item, index) => {
        const prefix = `${index + 1}. `;
        const text = sanitizePdfText(item);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9.5);
        setTextColor(pdf, PDF_COLORS.primary);

        const lines = pdf.splitTextToSize(text, contentWidth - 8);
        const neededHeight = Math.max(7, lines.length * 4.8 + 2);

        y = addPageIfNeeded(pdf, y, neededHeight, margin);

        setTextColor(pdf, PDF_COLORS.muted);
        pdf.text(prefix, margin, y);

        setTextColor(pdf, PDF_COLORS.primary);
        pdf.text(lines, margin + 8, y);

        y += neededHeight;
    });

    return y + 2;
};

export default function EmpresasInventarioIA() {

    const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
    const [empresaId, setEmpresaId] = useState<number | undefined>();
    const [periodo, setPeriodo] = useState<Dayjs>(dayjs());

    const [loadingEmpresas, setLoadingEmpresas] = useState(false);
    const [loadingAnalisis, setLoadingAnalisis] = useState(false);
    const [loadingPdf, setLoadingPdf] = useState(false);

    const [data, setData] = useState<InventarioIAResponse | null>(null);

    const mes = periodo.month() + 1;
    const ano = periodo.year();

    const empresaSeleccionada = empresas.find(
        (empresa) => empresa.id_empresa === empresaId
    );

    const fetchEmpresas = async () => {
        try {
            setLoadingEmpresas(true);

            const res = await http.get("/empresas", {
                params: {
                    page: 1,
                    pageSize: 1000,
                },
            });

            setEmpresas(res.data.data ?? res.data.items ?? []);
        } catch (error) {
            console.error("Error cargando empresas:", error);
            setEmpresas([]);
            message.error("Error cargando empresas");
        } finally {
            setLoadingEmpresas(false);
        }
    };

    const analizar = async () => {
        if (!empresaId) {
            message.warning("Selecciona una empresa");
            return;
        }

        try {
            setLoadingAnalisis(true);
            setData(null);

            const res = await http.get(`/ia-inventario/${empresaId}`, {
                params: {
                    mes,
                    ano,
                },
            });

            setData({
                empresaId: res.data.empresaId,
                totalEquipos: res.data.totalEquipos,
                analisis: {
                    resumen: res.data.analisis?.resumen ?? "",
                    hallazgos: res.data.analisis?.hallazgos ?? [],
                    riesgos: res.data.analisis?.riesgos ?? [],
                    recomendaciones: res.data.analisis?.recomendaciones ?? [],
                },
            });

            message.success("Análisis generado correctamente");
        } catch (error) {
            console.error("Error analizando inventario:", error);
            message.error("Error analizando inventario");
        } finally {
            setLoadingAnalisis(false);
        }
    };

    const cargarGuardado = async () => {
        if (!empresaId) {
            message.warning("Selecciona una empresa");
            return;
        }

        try {
            setLoadingAnalisis(true);
            setData(null);

            const res = await http.get(`/ia-inventario/${empresaId}/guardado`, {
                params: {
                    mes,
                    ano,
                },
            });

            const item = res.data.data;

            if (!item) {
                message.warning("No existe análisis guardado para este periodo");
                return;
            }

            setData({
                empresaId: item.empresaId,
                totalEquipos: item.totalEquipos,
                analisis: {
                    resumen: item.resumen ?? "",
                    hallazgos: item.hallazgos ?? [],
                    riesgos: item.riesgos ?? [],
                    recomendaciones: item.recomendaciones ?? [],
                },
            });

            message.success("Análisis guardado cargado correctamente");
        } catch (error) {
            console.error("Error cargando análisis guardado:", error);
            message.error("Error cargando análisis guardado");
        } finally {
            setLoadingAnalisis(false);
        }
    };

    const generarPdfDesdeFront = async () => {
        if (!data) {
            message.warning("Primero debes generar o cargar un análisis");
            return;
        }

        try {
            setLoadingPdf(true);

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
                compress: true,
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const margin = 14;
            const contentWidth = pageWidth - margin * 2;

            const empresaNombre = empresaSeleccionada?.nombre ?? `Empresa ${empresaId}`;
            const periodoTexto = `${String(mes).padStart(2, "0")}/${ano}`;
            const fechaEmision = new Date().toLocaleDateString("es-CL");

            let y = margin;

            setFillColor(pdf, PDF_COLORS.lightBg);
            setDrawColor(pdf, PDF_COLORS.border);
            pdf.roundedRect(margin, y, contentWidth, 24, 3, 3, "FD");

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(16);
            setTextColor(pdf, PDF_COLORS.primary);
            pdf.text("Análisis IA de Inventario", margin + 5, y + 8);

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
            setTextColor(pdf, PDF_COLORS.muted);
            pdf.text(`Empresa: ${empresaNombre}`, margin + 5, y + 15);
            pdf.text(`Equipos analizados: ${data.totalEquipos}`, margin + 5, y + 20);

            pdf.text(`Periodo: ${periodoTexto}`, pageWidth - margin - 55, y + 15);
            pdf.text(`Fecha de emisión: ${fechaEmision}`, pageWidth - margin - 55, y + 20);

            y += 32;

            const gap = 4;
            const cardWidth = (contentWidth - gap * 3) / 4;
            const cardHeight = 22;

            drawInfoCard(pdf, "Empresa", empresaNombre, margin, y, cardWidth, cardHeight);
            drawInfoCard(
                pdf,
                "Periodo",
                periodoTexto,
                margin + cardWidth + gap,
                y,
                cardWidth,
                cardHeight
            );
            drawInfoCard(
                pdf,
                "Equipos",
                data.totalEquipos,
                margin + (cardWidth + gap) * 2,
                y,
                cardWidth,
                cardHeight
            );
            drawInfoCard(
                pdf,
                "Hallazgos",
                data.analisis.hallazgos?.length ?? 0,
                margin + (cardWidth + gap) * 3,
                y,
                cardWidth,
                cardHeight
            );

            y += cardHeight + 10;

            y = drawSectionTitle(pdf, "Resumen", y, margin, contentWidth);
            y = drawWrappedParagraph(
                pdf,
                data.analisis.resumen || "Sin resumen",
                y,
                margin,
                contentWidth,
                {
                    fontSize: 10,
                    lineHeight: 5.2,
                }
            );

            y += 4;

            y = drawSectionTitle(pdf, "Hallazgos", y, margin, contentWidth);

            const hallazgos = data.analisis.hallazgos ?? [];

            if (!hallazgos.length) {
                y = drawWrappedParagraph(
                    pdf,
                    "Sin hallazgos registrados.",
                    y,
                    margin,
                    contentWidth,
                    {
                        color: PDF_COLORS.muted,
                    }
                );
            } else {
                hallazgos.forEach((hallazgo, index) => {
                    const severidad = hallazgo.severidad ?? "BAJA";
                    const descripcion = sanitizePdfText(hallazgo.descripcion);
                    const severityColor = getSeverityPdfColor(severidad);

                    pdf.setFont("helvetica", "normal");
                    pdf.setFontSize(9.2);

                    const lines = pdf.splitTextToSize(descripcion, contentWidth - 34);
                    const boxHeight = Math.max(11, lines.length * 4.8 + 5);

                    y = addPageIfNeeded(pdf, y, boxHeight + 2, margin);

                    setFillColor(pdf, PDF_COLORS.white);
                    setDrawColor(pdf, PDF_COLORS.border);
                    pdf.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, "FD");

                    setFillColor(pdf, severityColor);
                    pdf.circle(margin + 5, y + 5.7, 1.4, "F");

                    pdf.setFont("helvetica", "bold");
                    pdf.setFontSize(7.5);
                    setTextColor(pdf, severityColor);
                    pdf.text(severidad, margin + 10, y + 6.5);

                    pdf.setFont("helvetica", "normal");
                    pdf.setFontSize(9.2);
                    setTextColor(pdf, PDF_COLORS.primary);
                    pdf.text(`${index + 1}.`, margin + 25, y + 6.5);
                    pdf.text(lines, margin + 32, y + 6.5);

                    y += boxHeight + 2;
                });
            }

            y += 4;

            y = drawSectionTitle(pdf, "Riesgos", y, margin, contentWidth);
            y = drawBulletList(
                pdf,
                data.analisis.riesgos ?? [],
                y,
                margin,
                contentWidth
            );

            y += 4;

            y = drawSectionTitle(pdf, "Recomendaciones", y, margin, contentWidth);
            y = drawBulletList(
                pdf,
                data.analisis.recomendaciones ?? [],
                y,
                margin,
                contentWidth
            );

            const totalPages = pdf.getNumberOfPages();

            for (let i = 1; i <= totalPages; i += 1) {
                pdf.setPage(i);

                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(8);
                setTextColor(pdf, PDF_COLORS.muted);

                pdf.text(
                    `Página ${i} de ${totalPages}`,
                    pageWidth - margin - 22,
                    pdf.internal.pageSize.getHeight() - 8
                );

                pdf.text(
                    "Reporte generado desde RIDS CRM",
                    margin,
                    pdf.internal.pageSize.getHeight() - 8
                );
            }

            const filename = `analisis-inventario-${normalizarNombreArchivo(
                empresaNombre
            )}-${String(mes).padStart(2, "0")}-${ano}.pdf`;

            pdf.save(filename);

            message.success("PDF generado correctamente");
        } catch (error) {
            console.error("Error generando PDF:", error);
            message.error("Error generando PDF");
        } finally {
            setLoadingPdf(false);
        }
    };

    useEffect(() => {
        void fetchEmpresas();
    }, []);

    return (
        <div className="w-full space-y-5">
            <div className="space-y-1">
                <h2 className="text-base font-semibold text-slate-800 sm:text-lg md:text-xl">
                    Análisis IA de inventario
                </h2>

                <p className="text-xs text-slate-500 sm:text-sm">
                    Analiza el inventario de equipos por empresa, revisa resultados por mes
                    y genera un PDF desde el navegador.
                </p>
            </div>

            <Card className="w-full">
                <Row gutter={[12, 12]} align="middle">
                    <Col xs={24} sm={24} md={10} lg={7} xl={7}>
                        <Select
                            placeholder="Seleccionar empresa"
                            allowClear
                            showSearch
                            loading={loadingEmpresas}
                            value={empresaId}
                            style={{ width: "100%" }}
                            optionFilterProp="label"
                            options={empresas.map((empresa) => ({
                                value: empresa.id_empresa,
                                label: empresa.nombre,
                            }))}
                            onChange={(value) => {
                                setEmpresaId(value);
                                setData(null);
                            }}
                        />
                    </Col>

                    <Col xs={24} sm={12} md={6} lg={4} xl={3}>
                        <DatePicker
                            picker="month"
                            value={periodo}
                            format="MM/YYYY"
                            style={{ width: "100%" }}
                            onChange={(value) => {
                                if (value) {
                                    setPeriodo(value);
                                    setData(null);
                                }
                            }}
                        />
                    </Col>

                    <Col xs={24} sm={12} md={8} lg={13} xl={14}>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
                            <Button
                                type="primary"
                                icon={<RobotOutlined />}
                                disabled={!empresaId || loadingAnalisis}
                                loading={loadingAnalisis}
                                onClick={analizar}
                                block
                                className="lg:w-auto"
                            >
                                Generar análisis IA
                            </Button>

                            <Button
                                icon={<FileSearchOutlined />}
                                disabled={!empresaId || loadingAnalisis}
                                loading={loadingAnalisis}
                                onClick={cargarGuardado}
                                block
                                className="lg:w-auto"
                            >
                                Ver guardado
                            </Button>

                            <Button
                                icon={<DownloadOutlined />}
                                disabled={!empresaId || !data}
                                loading={loadingPdf}
                                onClick={generarPdfDesdeFront}
                                block
                                className="lg:w-auto"
                            >
                                Descargar PDF
                            </Button>

                            <Button
                                icon={<ReloadOutlined />}
                                onClick={fetchEmpresas}
                                loading={loadingEmpresas}
                                block
                                className="lg:w-auto"
                            >
                                Recargar
                            </Button>
                        </div>
                    </Col>
                </Row>
            </Card>

            {!empresaId && (
                <Card>
                    <Empty description="Selecciona una empresa para iniciar el análisis." />
                </Card>
            )}

            {empresaId && !data && !loadingAnalisis && (
                <Card>
                    <Empty
                        description={`No hay análisis cargado para ${String(mes).padStart(
                            2,
                            "0"
                        )}/${ano}. Puedes generar uno nuevo o cargar uno guardado.`}
                    />
                </Card>
            )}

            {loadingAnalisis && (
                <Card>
                    <div className="py-8 text-center sm:py-10">
                        <Spin />
                        <div className="mt-3 text-xs text-slate-500 sm:text-sm">
                            Procesando análisis...
                        </div>
                    </div>
                </Card>
            )}

            {data && (
                <div
                    className="w-full space-y-4 bg-white p-3 sm:p-4 md:p-5"
                >
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h1 className="text-lg font-bold text-slate-800 sm:text-xl md:text-2xl">
                            Análisis IA de Inventario
                        </h1>

                        <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-600 sm:text-sm md:grid-cols-2">
                            <p className="m-0">
                                <strong>Empresa:</strong>{" "}
                                {empresaSeleccionada?.nombre ?? data.empresaId}
                            </p>

                            <p className="m-0">
                                <strong>Periodo:</strong>{" "}
                                {String(mes).padStart(2, "0")}/{ano}
                            </p>

                            <p className="m-0">
                                <strong>Equipos analizados:</strong> {data.totalEquipos}
                            </p>

                            <p className="m-0">
                                <strong>Fecha de emisión:</strong>{" "}
                                {new Date().toLocaleDateString("es-CL")}
                            </p>
                        </div>
                    </div>

                    <Row gutter={[12, 12]}>
                        <Col xs={24} sm={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="Empresa"
                                    value={empresaSeleccionada?.nombre ?? data.empresaId}
                                />
                            </Card>
                        </Col>

                        <Col xs={24} sm={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="Periodo"
                                    value={`${String(mes).padStart(2, "0")}/${ano}`}
                                />
                            </Card>
                        </Col>

                        <Col xs={24} sm={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="Equipos"
                                    value={data.totalEquipos}
                                />
                            </Card>
                        </Col>

                        <Col xs={24} sm={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="Hallazgos"
                                    value={data.analisis.hallazgos?.length ?? 0}
                                />
                            </Card>
                        </Col>
                    </Row>

                    <Card title="Resumen">
                        <p className="m-0 whitespace-pre-line text-sm leading-6 text-slate-700">
                            {data.analisis.resumen || "Sin resumen"}
                        </p>
                    </Card>

                    <Card title="Hallazgos">
                        {data.analisis.hallazgos?.length ? (
                            <div className="space-y-2">
                                {data.analisis.hallazgos.map((h, i) => (
                                    <Alert
                                        key={`${h.severidad}-${i}`}
                                        type={getSeveridadAlertType(h.severidad)}
                                        message={
                                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start">
                                                <Tag
                                                    color={getSeveridadColor(h.severidad)}
                                                    className="w-fit"
                                                >
                                                    {h.severidad}
                                                </Tag>

                                                <span className="text-sm leading-6">
                                                    {h.descripcion}
                                                </span>
                                            </div>
                                        }
                                        showIcon
                                    />
                                ))}
                            </div>
                        ) : (
                            <Empty description="Sin hallazgos" />
                        )}
                    </Card>

                    <Card title="Riesgos">
                        {data.analisis.riesgos?.length ? (
                            <ul className="m-0 space-y-2 pl-5 text-sm leading-6 text-slate-700">
                                {data.analisis.riesgos.map((riesgo, i) => (
                                    <li key={`${riesgo}-${i}`}>{riesgo}</li>
                                ))}
                            </ul>
                        ) : (
                            <Empty description="Sin riesgos registrados" />
                        )}
                    </Card>

                    <Card title="Recomendaciones">
                        {data.analisis.recomendaciones?.length ? (
                            <ul className="m-0 space-y-2 pl-5 text-sm leading-6 text-slate-700">
                                {data.analisis.recomendaciones.map((recomendacion, i) => (
                                    <li key={`${recomendacion}-${i}`}>
                                        {recomendacion}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <Empty description="Sin recomendaciones" />
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}