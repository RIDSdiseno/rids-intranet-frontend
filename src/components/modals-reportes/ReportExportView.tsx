import React from "react";
import type { ReporteGeneralData } from "../modals-reportes/typesReportes";
import { buildReporteExportData } from "./buildReporteExportData";

type Props = {
    data: ReporteGeneralData;
    empresaNombre: string;
    periodoTexto: string;
    recomendaciones: string;
    showDetails?: boolean;
};

const pageStyle: React.CSSProperties = {
    width: 794,
    background: "#ffffff",
    padding: "40px 42px",
    color: "#0f172a",
    fontFamily: "Arial, Helvetica, sans-serif",
    lineHeight: 1.45,
};

const headerBoxStyle: React.CSSProperties = {
    borderBottom: "3px solid #1d4ed8",
    paddingBottom: 16,
    marginBottom: 28,
};

const titleStyle: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
    color: "#0f172a",
};

const subtitleStyle: React.CSSProperties = {
    fontSize: 14,
    color: "#475569",
    marginTop: 8,
};

const metaRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    fontSize: 12,
    color: "#64748b",
    marginTop: 12,
};

const sectionStyle: React.CSSProperties = {
    marginBottom: 24,
    padding: 18,
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    background: "#ffffff",
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a",
    margin: "0 0 12px 0",
};

const sectionTextStyle: React.CSSProperties = {
    fontSize: 13,
    color: "#334155",
    margin: 0,
};

const summaryGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 24,
};

const summaryCardStyle: React.CSSProperties = {
    border: "1px solid #dbeafe",
    background: "#f8fbff",
    borderRadius: 12,
    padding: 14,
};

const summaryLabelStyle: React.CSSProperties = {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#64748b",
    marginBottom: 6,
};

const summaryValueStyle: React.CSSProperties = {
    fontSize: 13,
    color: "#0f172a",
    margin: 0,
};

const tableWrapStyle: React.CSSProperties = {
    marginTop: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    overflow: "hidden",
};

const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
};

const thStyle: React.CSSProperties = {
    background: "#eff6ff",
    color: "#1e3a8a",
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid #dbeafe",
    fontWeight: 700,
};

const tdStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderBottom: "1px solid #e2e8f0",
    color: "#1f2937",
    verticalAlign: "top",
};

const recommendationsStyle: React.CSSProperties = {
    marginTop: 8,
    padding: 18,
    borderRadius: 12,
    background: "#f8fafc",
    borderLeft: "5px solid #2563eb",
    fontSize: 13,
    color: "#334155",
    whiteSpace: "pre-wrap",
};

export const ReporteExportView: React.FC<Props> = ({
    data,
    empresaNombre,
    periodoTexto,
    recomendaciones,
    showDetails = true,
}) => {
    const exportData = buildReporteExportData({
        data,
        periodoTexto,
        empresaNombre,
    });

    const {
        dashboardMonthlySummary,
        dashboardMonthlyRows,
        teamViewerMonthlySummaryText,
        tvBreakdownRows,
        resumenVisitasTecnicas,
        totalSoporteResumen,
    } = exportData;

    const fechaEmision = new Date().toLocaleDateString("es-CL");

    return (
        <div style={pageStyle}>
            <div style={headerBoxStyle}>
                <h1 style={titleStyle}>Informe Operativo</h1>
                <div style={subtitleStyle}>
                    Reporte consolidado de soporte, mantenciones y atención técnica
                </div>

                <div style={metaRowStyle}>
                    <span><strong>Empresa:</strong> {empresaNombre}</span>
                    <span><strong>Período:</strong> {periodoTexto}</span>
                    <span><strong>Emitido:</strong> {fechaEmision}</span>
                </div>
            </div>

            <div style={summaryGridStyle}>
                <div style={summaryCardStyle}>
                    <div style={summaryLabelStyle}>Tickets</div>
                    <p style={summaryValueStyle}>{dashboardMonthlySummary}</p>
                </div>

                <div style={summaryCardStyle}>
                    <div style={summaryLabelStyle}>Mantenciones remotas</div>
                    <p style={summaryValueStyle}>{teamViewerMonthlySummaryText}</p>
                </div>

                <div style={summaryCardStyle}>
                    <div style={summaryLabelStyle}>Visitas técnicas</div>
                    <p style={summaryValueStyle}>{resumenVisitasTecnicas}</p>
                </div>

                <div style={summaryCardStyle}>
                    <div style={summaryLabelStyle}>Horas de soporte</div>
                    <p style={summaryValueStyle}>{totalSoporteResumen}</p>
                </div>
            </div>

            <section style={sectionStyle}>
                <h2 style={sectionTitleStyle}>Resumen mensual de tickets</h2>
                <p style={sectionTextStyle}>{dashboardMonthlySummary}</p>

                {showDetails && dashboardMonthlyRows.length > 0 && (
                    <div style={tableWrapStyle}>
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    {["Mes", "Tickets", "Cerrados", "Horas est.", "% ≤ 8h", "Mediana", "Complejos"].map((h) => (
                                        <th key={h} style={thStyle}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {dashboardMonthlyRows.map((row, i) => (
                                    <tr key={i}>
                                        <td style={tdStyle}>{row.Mes}</td>
                                        <td style={tdStyle}>{row.Tickets}</td>
                                        <td style={tdStyle}>{row.Cerrados}</td>
                                        <td style={tdStyle}>{row["Horas est."]}</td>
                                        <td style={tdStyle}>{row["% ≤ 8h"]}</td>
                                        <td style={tdStyle}>{row.Mediana}</td>
                                        <td style={tdStyle}>{row.Complejos}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section style={sectionStyle}>
                <h2 style={sectionTitleStyle}>Resumen mensual de mantenciones remotas</h2>
                <p style={sectionTextStyle}>{teamViewerMonthlySummaryText}</p>

                {showDetails && tvBreakdownRows.length > 0 && (
                    <div style={tableWrapStyle}>
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    {["Mes", "Sesiones", "Minutos", "Horas"].map((h) => (
                                        <th key={h} style={thStyle}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tvBreakdownRows.map((row, i) => (
                                    <tr key={i}>
                                        <td style={tdStyle}>{row.Mes}</td>
                                        <td style={tdStyle}>{row.Sesiones}</td>
                                        <td style={tdStyle}>{row.Minutos}</td>
                                        <td style={tdStyle}>{row.Horas}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section style={sectionStyle}>
                <h2 style={sectionTitleStyle}>Resumen de visitas técnicas</h2>
                <p style={sectionTextStyle}>{resumenVisitasTecnicas}</p>
            </section>

            <section style={sectionStyle}>
                <h2 style={sectionTitleStyle}>Total mensual de horas de soporte</h2>
                <p style={sectionTextStyle}>{totalSoporteResumen}</p>
            </section>

            <section style={sectionStyle}>
                <h2 style={sectionTitleStyle}>Recomendaciones</h2>
                <div style={recommendationsStyle}>
                    {recomendaciones || "Sin recomendaciones adicionales."}
                </div>
            </section>
        </div>
    );
};