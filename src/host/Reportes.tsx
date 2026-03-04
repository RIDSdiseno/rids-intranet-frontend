// pages/ReportesPage.tsx
import React, { useRef, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  DownloadOutlined,
  FileExcelOutlined,
  LoadingOutlined,
  HomeOutlined,
  BarChartOutlined,
  BuildOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { Button, Input, message } from "antd";

// Types
import type { ReporteGeneralData } from "../components/modals-reportes/typesReportes";

// Hooks
import { useReportesData } from "../components/modals-reportes/Usereportesdata";
import { useExportReportes } from "../components/modals-reportes/UseExportReportes";

// Components
import { KPICards } from "../components/modals-reportes/KpiCards";
import { WizardSelector } from "../components/modals-reportes/WizardSelector";
import { PdfModal } from "../components/modals-reportes/PdfModal";

// Utils
import {
  TEXTO_FIJO,
  generarFolio,
  contarMantenimientos,
  contarExtras,
} from "../components/modals-reportes/utilsReportes";

// ─── Config ───────────────────────────────────────────────────────────────

const API_URL =
  (import.meta as ImportMeta).env.VITE_API_URL || "http://localhost:4000/api";

const MONTHS_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ─── Component ────────────────────────────────────────────────────────────

const ReportesPage: React.FC = () => {
  const navigate = useNavigate();

  // ── Data hook ──
  const { empresas, globalError, obtenerDatosReporteGeneral } = useReportesData();

  // ── Filtros ──
  const [empresaFiltro, setEmpresaFiltro] = useState("");
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // ── Portada / recomendaciones ──
  const [docxTitulo, setDocxTitulo] = useState("Informe Operativo");
  const [docxSubtitulo, setDocxSubtitulo] = useState(TEXTO_FIJO.subtitulo);
  const [recomendaciones, setRecomendaciones] = useState("");
  const [loadingIA, setLoadingIA] = useState(false);

  // ── Preview ──
  const [dataPrev, setDataPrev] = useState<ReporteGeneralData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // ── PDF modal ──
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // ── Derived ──
  const empresaNombre = useMemo(
    () => empresas.find((e) => e.id_empresa === Number(empresaFiltro))?.nombre || TEXTO_FIJO.paraDefault,
    [empresas, empresaFiltro]
  );

  const periodoTexto = useMemo(() => {
    if (!selectedYear || !selectedMonth) return "";
    return `${MONTHS_NAMES[Number(selectedMonth) - 1]} ${selectedYear}`;
  }, [selectedYear, selectedMonth]);

  const canGenerate = !!empresaFiltro && !!selectedYear && !!selectedMonth;

  // ── Export hook ──
  const { exportStatus, exportDOCX, exportXLSX, generarPdfBlob } = useExportReportes({
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
    onDataLoaded: setDataPrev,
  });

  // ── IA ──
  const generarRecomendacionesIA = async () => {
    if (!empresaId) { message.warning("Selecciona una empresa primero"); return; }
    setLoadingIA(true);
    try {
      const res = await fetch(`${API_URL}/ia-inventario/analisis-inventario/${empresaId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const analisis = data?.analisis;
      if (!analisis?.recomendaciones) throw new Error("Respuesta IA inválida");
      setRecomendaciones(analisis.recomendaciones.map((r: string) => `• ${r}`).join("\n"));
    } catch { message.error("Error generando recomendaciones"); }
    finally { setLoadingIA(false); }
  };

  const generarInformeIA = async () => {
    if (!empresaId || !selectedYear || !selectedMonth) { message.warning("Selecciona empresa, año y mes"); return; }
    setLoadingIA(true);
    try {
      const res = await fetch(`${API_URL}/ia-reportes/informe-mensual/${empresaId}/${selectedYear}/${selectedMonth}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecomendaciones(data.informe);
    } catch { message.error("Error generando informe IA"); }
    finally { setLoadingIA(false); }
  };

  // ── Handlers ──
  const handleEmpresaChange = (id: string) => {
    setEmpresaFiltro(id);
    setEmpresaId(Number(id));
    setSelectedYear("");
    setSelectedMonth("");
  };

  const previsualizarDatos = async () => {
    const data = await obtenerDatosReporteGeneral(empresaFiltro, selectedYear, selectedMonth);
    setDataPrev(data);
    setShowPreview(true);
  };

  const abrirPDF = async () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    const url = await generarPdfBlob();
    if (url) {
      setPdfUrl(url);
      setPdfModalOpen(true);
    }
  };

  const closePdfModal = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setPdfModalOpen(false);
  };

  // ── Estilos para contenedor PDF oculto ──
  const cellBorder: React.CSSProperties = { border: "1px solid #E5E7EB", padding: "6px 8px", fontSize: 12, color: "#0F172A" };
  const cellHeader: React.CSSProperties = { ...cellBorder, background: "#F1F5F9", fontWeight: 700 };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: "#1F2937", marginBottom: 2 };
  const valueStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: "#111827" };

  // ── Render ──
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-slate-50 to-white">

      {/* ── Nav ── */}
      <div className="bg-white/60 backdrop-blur border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-slate-600 hover:text-blue-600">
            <HomeOutlined /> Dashboard
          </button>
          <button onClick={() => navigate("/empresas")} className="flex items-center gap-2 text-slate-600 hover:text-blue-600">
            <BarChartOutlined /> Analytics
          </button>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-8 shadow-lg mb-8"
        >
          <div className="flex items-start gap-4">
            <div className="text-4xl"><FileExcelOutlined /></div>
            <div>
              <h1 className="text-3xl font-extrabold">Reportes Operativos</h1>
              <p className="opacity-90">Selecciona empresa, año y mes para generar tu informe en Word, Excel y PDF.</p>
              {canGenerate && (
                <div className="mt-2 text-sm flex items-center gap-2 opacity-95">
                  <CheckCircleOutlined />
                  {empresaNombre} · {periodoTexto}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {globalError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">{globalError}</div>
        )}

        {/* ── Wizard ── */}
        <WizardSelector
          empresas={empresas}
          empresaFiltro={empresaFiltro}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onEmpresaChange={handleEmpresaChange}
          onYearChange={(y) => { setSelectedYear(y); setSelectedMonth(""); }}
          onMonthChange={setSelectedMonth}
        />

        {/* ── Preview ── */}
        {showPreview && dataPrev && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8"
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <BarChartOutlined /> Vista Previa del Reporte
            </h3>
            <KPICards data={dataPrev} />
          </motion.div>
        )}

        {/* ── Acciones ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 flex-wrap mb-4">
            <button
              onClick={previsualizarDatos}
              disabled={!canGenerate || exportStatus.exporting}
              className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50"
            >
              <EyeOutlined className="mr-2" /> Previsualizar Datos
            </button>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={exportDOCX}
              disabled={!canGenerate || exportStatus.exporting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50"
            >
              {exportStatus.exporting
                ? <><LoadingOutlined className="animate-spin mr-2" />Generando…</>
                : <><DownloadOutlined className="mr-2" />Descargar Word (DOCX)</>}
            </button>
            <button
              onClick={exportXLSX}
              disabled={!canGenerate || exportStatus.exporting}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50"
            >
              <DownloadOutlined className="mr-2" /> Descargar Respaldo (XLSX)
            </button>
            <button
              onClick={abrirPDF}
              disabled={!canGenerate || exportStatus.exporting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50"
            >
              <EyeOutlined className="mr-2" /> Ver PDF (modal)
            </button>
          </div>
          {exportStatus.error && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {exportStatus.error}
            </div>
          )}
        </motion.div>

        {/* ── Canvas ocultos para charts DOCX ── */}
        <div style={{ position: "fixed", left: -10000, top: -10000, opacity: 0, pointerEvents: "none", zIndex: -1 }}>
          <canvas id="chart-mantxfecha-docx" width={800} height={400} />
          <canvas id="chart-solicitudes-pie-docx" width={800} height={400} />
          <canvas id="chart-mantenimientos-docx" width={800} height={400} />
          <canvas id="chart-topusuarios-docx" width={800} height={400} />
          <canvas id="chart-equiposmarca-docx" width={800} height={400} />
          <canvas id="chart-mantxusuario-docx" width={800} height={400} />
          <canvas id="chart-distribucion-docx" width={800} height={400} />
          <canvas id="chart-tendencias-docx" width={800} height={400} />
        </div>

        {/* ── Contenedor oculto PDF ── */}
        <div
          ref={previewRef}
          id="pdf-preview-root"
          style={{ position: "fixed", left: -10000, top: -10000, width: 794, background: "#FFFFFF", color: "#0F172A", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, opacity: 0, pointerEvents: "none", zIndex: -1 }}
        >
          {/* Cabecera */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
            <img src="/login/LOGO_RIDS.png" alt="RIDS" style={{ height: 44, width: "auto", objectFit: "contain" }} onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1F2937" }}>{docxTitulo}</div>
          </div>

          <div style={{ background: "linear-gradient(90deg,#111827 0%,#1F2937 100%)", color: "#FFFFFF", borderRadius: 10, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{docxSubtitulo}</div>
            <div style={{ marginTop: 8, opacity: 0.9 }}>{TEXTO_FIJO.correo} · Periodo: {periodoTexto || "—"}</div>
            <div style={{ marginTop: 10, fontWeight: 700 }}>{generarFolio(empresaNombre)}</div>
          </div>

          {/* Metadata grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12, marginBottom: 16 }}>
            {[
              ["Para", empresaNombre],
              ["De", TEXTO_FIJO.de],
              ["Asunto", `${TEXTO_FIJO.asunto} (${periodoTexto || "—"})`],
              ["Fecha", new Date().toLocaleDateString("es-CL")],
              ["Ingeniera en conocimiento", TEXTO_FIJO.ingeniera],
              ["Técnicos en conocimientos", TEXTO_FIJO.tecnicos],
            ].map(([l, v]) => (
              <div key={l} style={{ background: "#F3F4F6", borderRadius: 8, padding: 12 }}>
                <div style={labelStyle}>{l}</div>
                <div style={valueStyle}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 12, fontSize: 14, lineHeight: 1.5 }}>{TEXTO_FIJO.intro}</div>

          {[
            ["Antecedentes", TEXTO_FIJO.antecedentes],
            ["Objetivos", TEXTO_FIJO.objetivos],
          ].map(([title, content]) => (
            <React.Fragment key={title}>
              <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>{title}</h4>
              <div style={{ fontSize: 14 }}>{content}</div>
            </React.Fragment>
          ))}

          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Métodos</h4>
          <ul style={{ fontSize: 14, paddingLeft: 18, marginTop: 4 }}>
            {TEXTO_FIJO.metodos.map((m) => <li key={m}>{m}</li>)}
          </ul>

          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Resultados</h4>
          <ul style={{ fontSize: 14, paddingLeft: 18, marginTop: 4 }}>
            {TEXTO_FIJO.resultados.map((m) => <li key={m}>{m}</li>)}
          </ul>

          {/* Tabla mantenimientos */}
          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Actividades de mantenimiento</h4>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead><tr>{["Ítem", "Cantidad"].map(h => <th key={h} style={cellHeader}>{h}</th>)}</tr></thead>
            <tbody>
              {contarMantenimientos(dataPrev?.visitas || []).map((r) => (
                <tr key={r.Ítem}><td style={cellBorder}>{r.Ítem}</td><td style={cellBorder}>{r.Cantidad}</td></tr>
              ))}
            </tbody>
          </table>

          {/* Tabla mantenciones remotas */}
          <h4 style={{ fontWeight: 800, marginTop: 24, marginBottom: 8 }}>Mantenciones Remotas</h4>
          <div style={{ fontSize: 14, marginBottom: 12 }}>
            Durante el periodo se ejecutaron <strong>{(dataPrev?.mantencionesRemotas || []).length}</strong> actividades de mantención remota.
          </div>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead><tr>{["ID", "Técnico", "Inicio", "Fin", "Estado", "Usuario"].map(h => <th key={h} style={cellHeader}>{h}</th>)}</tr></thead>
            <tbody>
              {(dataPrev?.mantencionesRemotas || []).map((m) => (
                <tr key={m.id_mantencion}>
                  <td style={cellBorder}>{m.id_mantencion}</td>
                  <td style={cellBorder}>{m.tecnico?.nombre ?? "—"}</td>
                  <td style={cellBorder}>{m.inicio ? new Date(m.inicio).toLocaleString("es-CL") : "—"}</td>
                  <td style={cellBorder}>{m.fin ? new Date(m.fin).toLocaleString("es-CL") : "—"}</td>
                  <td style={cellBorder}>{m.status ?? "—"}</td>
                  <td style={cellBorder}>{m.solicitante ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <canvas id="chart-preview-mantenimientos" width={700} height={300} />

          {/* Extras */}
          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Configuraciones y otros (totales)</h4>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead><tr>{["Ítem", "Cantidad"].map(h => <th key={h} style={cellHeader}>{h}</th>)}</tr></thead>
            <tbody>
              {contarExtras(dataPrev?.visitas || []).totales.map((r) => (
                <tr key={r.Ítem}><td style={cellBorder}>{r.Ítem}</td><td style={cellBorder}>{r.Cantidad}</td></tr>
              ))}
            </tbody>
          </table>

          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Detalle de "Otros"</h4>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead><tr>{["Detalle otros", "Cantidad"].map(h => <th key={h} style={cellHeader}>{h}</th>)}</tr></thead>
            <tbody>
              {(contarExtras(dataPrev?.visitas || []).detalles.length
                ? contarExtras(dataPrev?.visitas || []).detalles
                : [{ Detalle: "—", Cantidad: 0 }]
              ).map((d, i) => (
                <tr key={i}><td style={cellBorder}>{d.Detalle}</td><td style={cellBorder}>{d.Cantidad}</td></tr>
              ))}
            </tbody>
          </table>

          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Listado de correos activos</h4>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead><tr>{["Nro", "Nombre", "Correo electrónico"].map(h => <th key={h} style={cellHeader}>{h}</th>)}</tr></thead>
            <tbody>
              {(dataPrev?.solicitantes || []).slice(0, 400).map((s, i) => (
                <tr key={s.id_solicitante}><td style={cellBorder}>{i + 1}</td><td style={cellBorder}>{s.nombre}</td><td style={cellBorder}>{s.email || ""}</td></tr>
              ))}
            </tbody>
          </table>

          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Inventario de equipamiento</h4>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
            <thead><tr>{["Serial", "Marca", "Modelo", "RAM", "Disco", "Propiedad", "Solicitante"].map(h => <th key={h} style={cellHeader}>{h}</th>)}</tr></thead>
            <tbody>
              {(dataPrev?.equipos || []).slice(0, 400).map((e, i) => {
                const sol = e.idSolicitante != null
                  ? (dataPrev?.solicitantes || []).find(s => s.id_solicitante === e.idSolicitante)?.nombre ?? ""
                  : "";
                return (
                  <tr key={i}>
                    <td style={cellBorder}>{e.serial ?? ""}</td><td style={cellBorder}>{e.marca ?? ""}</td>
                    <td style={cellBorder}>{e.modelo ?? ""}</td><td style={cellBorder}>{e.ram ?? ""}</td>
                    <td style={cellBorder}>{e.disco ?? ""}</td><td style={cellBorder}>{e.propiedad ?? ""}</td>
                    <td style={cellBorder}>{sol}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h4 style={{ fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Recomendaciones del periodo</h4>
          <div style={{ fontSize: 14 }}>{recomendaciones || "Sin recomendaciones adicionales para el periodo."}</div>
        </div>

        {/* ── Panel edición portada ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mt-6"
        >
          <h3 className="font-bold text-slate-800 mb-6 text-xl flex items-center justify-center">
            <BuildOutlined className="mr-3 text-slate-600" /> Portada y recomendaciones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-slate-600 mb-2">Título</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500" value={docxTitulo} onChange={(e) => setDocxTitulo(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-2">Subtítulo</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500" value={docxSubtitulo} onChange={(e) => setDocxSubtitulo(e.target.value)} />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm text-slate-600 mb-2">Recomendaciones</label>
            <Input.TextArea rows={5} value={recomendaciones} onChange={(e) => setRecomendaciones(e.target.value)} placeholder="Agrega recomendaciones del periodo..." />
            <div className="flex gap-3 mt-3 flex-wrap">
              <button
                onClick={generarRecomendacionesIA}
                disabled={loadingIA || !empresaFiltro}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow flex items-center gap-2 disabled:opacity-50"
              >
                {loadingIA ? <><LoadingOutlined className="animate-spin" />Analizando…</> : <><RobotOutlined />Recomendaciones con IA</>}
              </button>
              {/*
              <Button type="primary" icon={<RobotOutlined />} loading={loadingIA} onClick={generarInformeIA}>
                Generar informe mensual con IA
              </Button> */}
            </div>
          </div>
        </motion.div>

      </main>

      {/* ── Modales ── */}
      {pdfModalOpen && <PdfModal pdfUrl={pdfUrl} onClose={closePdfModal} />}

      {/* ── Loading overlay ── */}
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
