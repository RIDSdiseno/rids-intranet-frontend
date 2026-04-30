// FacturasDashboard.tsx
// Dashboard de Ventas y Compras desde el RCV del SII
// Instalar: npm install recharts
// Agregar ruta en tu router: /facturas

import React, { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FileTextOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  CalendarOutlined,
  BarChartOutlined,
} from "@ant-design/icons";

import { generarFacturaPDF } from "../components/modal-factura/generarFacturaPDF";

// ============================================================
// TIPOS
// ============================================================

type TabRCV = "ventas" | "compras";
type EmpresaKey = "econnet" | "rids";

interface DocumentoRCV {
  folio: number;
  tipoDTE: number;
  tipoDTEString?: string;

  tipoVenta?: string;
  tipoCompra?: string;

  rutReceptor?: string;
  razonSocialReceptor?: string;

  rutProveedor?: string;
  razonSocialProveedor?: string;

  fechaEmision: string;
  fechaRecepcion?: string;
  fechaAcuseRecibo?: string;
  fechaAcuse?: string;

  montoExento?: number;
  montoNeto: number;
  montoIVA: number;
  montoIvaRecuperable?: number;
  montoIvaNoRecuperable?: number;
  montoTotal: number;

  estado: string;

  raw?: any;
}

interface ResultadoRCV {
  rut: string;
  mes: string;
  ano: string;
  periodo?: string;

  ventas?: DocumentoRCV[];
  compras?: DocumentoRCV[];

  resumenes?: unknown[];
  total: number;
}

interface Toast {
  type: "success" | "error";
  message: string;
}

// ============================================================
// HELPERS
// ============================================================

const formatCLP = (valor: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
  }).format(valor || 0);

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const COLORES_ESTADO: Record<string, string> = {
  Confirmada: "#10b981",
  Pendiente: "#f59e0b",
  Anulada: "#ef4444",
  Rechazada: "#ef4444",
};

const COLORES_GRAFICO = [
  "#06b6d4",
  "#0891b2",
  "#0e7490",
  "#155e75",
  "#164e63",
];

const formatFechaHoraCL = (fecha?: string | null) => {
  if (!fecha) return "—";

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

const formatFechaCL = (fecha?: string | null) => {
  if (!fecha) return "—";

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const EMPRESAS_PDF: Record<
  EmpresaKey,
  {
    nombre: string;
    rut: string;
    direccion: string;
    correo: string;
    telefono: string;
    logo: string;
  }
> = {
  econnet: {
    nombre: "ECONNET SPA",
    rut: "76.758.352-4",
    direccion: "La Concepción 65, Providencia, Santiago",
    correo: "contacto@econnet.cl",
    telefono: "+56 9 8807 6593",
    logo: "/public/img/ecconetlogo.png",
  },
  rids: {
    nombre: "ASESORÍAS RIDS LTDA.",
    rut: "77.825.186-8",
    direccion: "Santiago, Chile",
    correo: "soporte@rids.cl",
    telefono: "+56 9 XXXX XXXX",
    logo: "/public/img/splash.png",
  },
};

const getNombreDocumento = (doc: DocumentoRCV, activeTab: TabRCV) => {
  if (activeTab === "ventas") {
    return doc.razonSocialReceptor ?? "";
  }

  return doc.razonSocialProveedor ?? "";
};

const getRutDocumento = (doc: DocumentoRCV, activeTab: TabRCV) => {
  if (activeTab === "ventas") {
    return doc.rutReceptor ?? "";
  }

  return doc.rutProveedor ?? "";
};

const getTipoDocumentoTexto = (doc: DocumentoRCV) => {
  if (doc.tipoDTEString) return doc.tipoDTEString;

  if (doc.tipoDTE === 33) return "Factura Electrónica";
  if (doc.tipoDTE === 34) return "Factura Exenta";
  if (doc.tipoDTE === 56) return "Nota de Débito";
  if (doc.tipoDTE === 61) return "Nota de Crédito";

  return `DTE ${doc.tipoDTE}`;
};

// ============================================================
// COMPONENTE METRIC CARD
// ============================================================

const MetricCard: React.FC<{
  titulo: string;
  valor: string;
  subtitulo?: string;
  icono: React.ReactNode;
  color: string;
  tendencia?: "up" | "down" | "neutral";
  tendenciaValor?: string;
}> = ({
  titulo,
  valor,
  subtitulo,
  icono,
  color,
  tendencia,
  tendenciaValor,
}) => (
    <div className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {titulo}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{valor}</p>
          {subtitulo && (
            <p className="mt-0.5 text-xs text-slate-400">{subtitulo}</p>
          )}
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}
        >
          {icono}
        </div>
      </div>

      {tendencia && tendenciaValor && (
        <div
          className={`mt-3 flex items-center gap-1 text-xs font-medium ${tendencia === "up"
            ? "text-emerald-600"
            : tendencia === "down"
              ? "text-red-500"
              : "text-slate-400"
            }`}
        >
          {tendencia === "up" ? (
            <ArrowUpOutlined />
          ) : tendencia === "down" ? (
            <ArrowDownOutlined />
          ) : null}
          {tendenciaValor}
        </div>
      )}
    </div>
  );

// ============================================================
// BADGE ESTADO
// ============================================================

const BadgeEstado: React.FC<{ estado: string }> = ({ estado }) => {
  const color = COLORES_ESTADO[estado] ?? "#94a3b8";

  const bg =
    estado === "Confirmada"
      ? "bg-emerald-100 text-emerald-700"
      : estado === "Pendiente"
        ? "bg-amber-100 text-amber-700"
        : estado === "Anulada" || estado === "Rechazada"
          ? "bg-red-100 text-red-700"
          : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${bg}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {estado || "Sin estado"}
    </span>
  );
};

// COMPONENTE DETALLE DOCUMENTO (MODAL)
const DetalleDocumentoModal: React.FC<{
  documento: DocumentoRCV | null;
  activeTab: TabRCV;
  onClose: () => void;
  onGenerarPDF: (doc: DocumentoRCV) => void;
  pdfLoading?: boolean;
}> = ({ documento, activeTab, onClose, onGenerarPDF, pdfLoading }) => {
  if (!documento) return null;

  const nombre =
    activeTab === "ventas"
      ? documento.razonSocialReceptor
      : documento.razonSocialProveedor;

  const rut =
    activeTab === "ventas"
      ? documento.rutReceptor
      : documento.rutProveedor;

  const tituloEntidad = activeTab === "ventas" ? "Cliente" : "Proveedor";

  const raw = documento.raw ?? {};

  const filasExtra = Object.entries(raw).filter(([key]) => {
    const camposOcultos = [
      "folio",
      "tipoDte",
      "tipoDTE",
      "tipoDTEString",
      "tipoVenta",
      "tipoCompra",
      "rutCliente",
      "rutProveedor",
      "razonSocial",
      "razonSocialProveedor",
      "fechaEmision",
      "fechaRecepcion",
      "montoExento",
      "montoNeto",
      "montoIva",
      "montoIVA",
      "montoTotal",
      "estado",
    ];

    return !camposOcultos.includes(key);
  });

  return (
    <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/40 px-3">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Detalle de {activeTab === "ventas" ? "venta" : "compra"} — Folio{" "}
              {documento.folio}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {documento.tipoDTEString || `DTE ${documento.tipoDTE}`} ·{" "}
              {documento.estado || "Sin estado"}
            </p>
          </div>

          <button
            onClick={() => onGenerarPDF(documento)}
            disabled={pdfLoading}
            className="rounded-full border border-emerald-200 px-3 py-1 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
          >
            Generar PDF
          </button>

          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500 transition hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[75vh] overflow-y-auto px-5 py-5">
          {/* Datos principales */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4">
              <p className="text-xs font-semibold uppercase text-cyan-700">
                {tituloEntidad}
              </p>

              <p className="mt-1 text-base font-bold text-slate-900">
                {nombre || "—"}
              </p>

              <p className="mt-1 text-sm text-slate-500">{rut || "—"}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Documento
              </p>

              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-500">Folio</span>
                <span className="text-right font-semibold text-slate-900">
                  {documento.folio}
                </span>

                <span className="text-slate-500">Tipo DTE</span>
                <span className="text-right font-semibold text-slate-900">
                  {documento.tipoDTEString || `DTE ${documento.tipoDTE}`}
                </span>

                <span className="text-slate-500">Estado</span>
                <span className="text-right font-semibold text-slate-900">
                  {documento.estado || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Fechas */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Fechas
            </h3>

            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
              <div>
                <p className="text-xs text-slate-400">Emisión</p>
                <p className="font-medium text-slate-800">
                  {formatFechaCL(documento.fechaEmision)}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">Recepción</p>
                <p className="font-medium text-slate-800">
                  {formatFechaHoraCL(documento.fechaRecepcion)}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">Acuse</p>
                <p className="font-medium text-slate-800">
                  {formatFechaHoraCL(documento.fechaAcuseRecibo ?? documento.fechaAcuse)}
                </p>
              </div>
            </div>
          </div>

          {/* Montos */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Montos
            </h3>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Exento</p>
                <p className="font-bold text-slate-900">
                  {formatCLP(documento.montoExento ?? 0)}
                </p>
              </div>

              <div className="rounded-lg bg-cyan-50 p-3">
                <p className="text-xs text-cyan-600">Neto</p>
                <p className="font-bold text-slate-900">
                  {formatCLP(documento.montoNeto)}
                </p>
              </div>

              <div className="rounded-lg bg-indigo-50 p-3">
                <p className="text-xs text-indigo-600">IVA</p>
                <p className="font-bold text-slate-900">
                  {formatCLP(documento.montoIVA)}
                </p>
              </div>

              <div className="rounded-lg bg-emerald-50 p-3">
                <p className="text-xs text-emerald-600">IVA Recuperable</p>
                <p className="font-bold text-slate-900">
                  {formatCLP(documento.montoIvaRecuperable ?? 0)}
                </p>
              </div>

              <div className="rounded-lg bg-slate-900 p-3">
                <p className="text-xs text-slate-300">Total</p>
                <p className="font-bold text-white">
                  {formatCLP(documento.montoTotal)}
                </p>
              </div>
            </div>
          </div>

          {/* Campos adicionales */}
          {filasExtra.length > 0 && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                Información adicional RCV
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {filasExtra.map(([key, value]) => (
                      <tr key={key}>
                        <td className="w-1/3 px-3 py-2 font-medium text-slate-500">
                          {key}
                        </td>

                        <td className="px-3 py-2 text-slate-800">
                          {value === null || value === undefined || value === ""
                            ? "—"
                            : typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Aviso */}
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Este detalle corresponde al Registro de Compras y Ventas del SII.
            Para ver ítems/productos de la factura, necesitas consultar el DTE/XML
            del documento.
          </div>
        </div>
      </div>
    </div>
  );
};

// COMPONENTE PDF
function documentoToFacturaPDF(doc: DocumentoRCV, activeTab: TabRCV) {
  const raw = doc.raw ?? {};

  if (activeTab === "ventas") {
    return {
      folio: doc.folio,
      tipoDTE: doc.tipoDTE,
      tipoDTEString: doc.tipoDTEString,
      tipoVenta: doc.tipoVenta,
      fechaEmision: doc.fechaEmision,
      fechaRecepcion: doc.fechaRecepcion,
      fechaAcuseRecibo: doc.fechaAcuseRecibo,
      estado: doc.estado,

      rutReceptor: doc.rutReceptor,
      razonSocialReceptor: doc.razonSocialReceptor,

      giroReceptor: raw.giroReceptor ?? raw.giroCliente ?? "",
      direccionReceptor: raw.direccionReceptor ?? raw.direccionCliente ?? "",
      comunaReceptor: raw.comunaReceptor ?? raw.comunaCliente ?? "",
      ciudadReceptor: raw.ciudadReceptor ?? raw.ciudadCliente ?? "",

      montoExento: doc.montoExento ?? 0,
      montoNeto: doc.montoNeto,
      montoIVA: doc.montoIVA,
      montoIVARecuperable: doc.montoIvaRecuperable ?? 0,
      montoTotal: doc.montoTotal,

      items: raw.items ?? raw.detalles ?? [],
    };
  }

  return {
    folio: doc.folio,
    tipoDTE: doc.tipoDTE,
    tipoDTEString: doc.tipoDTEString,
    tipoVenta: doc.tipoCompra,
    fechaEmision: doc.fechaEmision,
    fechaRecepcion: doc.fechaRecepcion,
    fechaAcuseRecibo: doc.fechaAcuse,
    estado: doc.estado,

    rutReceptor: doc.rutProveedor,
    razonSocialReceptor: doc.razonSocialProveedor,

    giroReceptor: raw.giroProveedor ?? raw.giroEmisor ?? "",
    direccionReceptor: raw.direccionProveedor ?? raw.direccionEmisor ?? "",
    comunaReceptor: raw.comunaProveedor ?? raw.comunaEmisor ?? "",
    ciudadReceptor: raw.ciudadProveedor ?? raw.ciudadEmisor ?? "",

    montoExento: doc.montoExento ?? 0,
    montoNeto: doc.montoNeto,
    montoIVA: doc.montoIVA,
    montoIVARecuperable: doc.montoIvaRecuperable ?? 0,
    montoTotal: doc.montoTotal,

    items: raw.items ?? raw.detalles ?? [],
  };
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

const FacturasDashboard: React.FC = () => {
  const now = new Date();

  const [mes, setMes] = useState(
    String(now.getMonth() + 1).padStart(2, "0")
  );
  const [ano, setAno] = useState(String(now.getFullYear()));
  const [activeTab, setActiveTab] = useState<TabRCV>("ventas");
  const [empresa, setEmpresa] = useState<EmpresaKey>("econnet");
  const [loading, setLoading] = useState(false);
  const [datos, setDatos] = useState<ResultadoRCV | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const [documentoSeleccionado, setDocumentoSeleccionado] =
    useState<DocumentoRCV | null>(null);

  const [pdfLoading, setPdfLoading] = useState(false);

  const showError = (msg: string) => {
    setToast({ type: "error", message: msg });
    setTimeout(() => setToast(null), 5000);
  };

  const handleGenerarPDF = async (doc: DocumentoRCV) => {
    try {
      setPdfLoading(true);

      const facturaPDF = documentoToFacturaPDF(doc, activeTab);
      const empresaPDF = EMPRESAS_PDF[empresa];

      await generarFacturaPDF(facturaPDF, empresaPDF);

      setToast({
        type: "success",
        message: "PDF generado correctamente",
      });

      setTimeout(() => setToast(null), 4000);
    } catch (error: any) {
      showError(error?.message ?? "No se pudo generar el PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const fetchDatos = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);

      try {
        const BASE_URL =
          import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

        const refreshParam = forceRefresh ? "&refresh=true" : "";

        const endpoint =
          activeTab === "ventas"
            ? `${BASE_URL}/facturas/ventas?mes=${mes}&ano=${ano}&empresa=${empresa}${refreshParam}`
            : `${BASE_URL}/facturas/compras?mes=${mes}&ano=${ano}&empresa=${empresa}${refreshParam}`;

        const token = localStorage.getItem("accessToken") ?? "";

        const res = await fetch(endpoint, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            err?.error ?? err?.message ?? `Error ${res.status}`
          );
        }

        const json = await res.json();
        setDatos(json.data);
      } catch (err: any) {
        showError(err?.message ?? "Error al cargar datos del SII");
      } finally {
        setLoading(false);
      }
    },
    [mes, ano, activeTab, empresa]
  );

  useEffect(() => {
    fetchDatos();
  }, [fetchDatos]);

  // ============================================================
  // MÉTRICAS CALCULADAS
  // ============================================================

  const documentos: DocumentoRCV[] =
    activeTab === "ventas" ? datos?.ventas ?? [] : datos?.compras ?? [];

  const documentosFiltrados = documentos.filter((doc) => {
    const nombre = getNombreDocumento(doc, activeTab);
    const rut = getRutDocumento(doc, activeTab);

    const matchBusqueda =
      !busqueda ||
      nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      String(doc.folio).includes(busqueda) ||
      rut.includes(busqueda);

    const matchEstado = !filtroEstado || doc.estado === filtroEstado;

    return matchBusqueda && matchEstado;
  });

  const totalNeto = documentos.reduce((s, doc) => s + doc.montoNeto, 0);
  const totalIVA = documentos.reduce((s, doc) => s + doc.montoIVA, 0);
  const totalBruto = documentos.reduce((s, doc) => s + doc.montoTotal, 0);
  const totalDocs = documentos.length;

  const confirmadas = documentos.filter(
    (doc) => doc.estado === "Confirmada"
  ).length;

  const pendientes = documentos.filter(
    (doc) => doc.estado === "Pendiente"
  ).length;

  // Gráfico por día
  const porDia = documentos.reduce<Record<string, number>>((acc, doc) => {
    const dia = doc.fechaEmision?.split("T")[0] ?? "Sin fecha";
    acc[dia] = (acc[dia] ?? 0) + doc.montoTotal;
    return acc;
  }, {});

  const datosGraficoDia = Object.entries(porDia)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, total]) => ({
      fecha: fecha.split("-").slice(1).join("/"),
      total,
    }));

  // Gráfico por cliente/proveedor top 5
  const porEntidad = documentos.reduce<Record<string, number>>((acc, doc) => {
    const nombre = getNombreDocumento(doc, activeTab) || "Sin nombre";
    acc[nombre] = (acc[nombre] ?? 0) + doc.montoTotal;
    return acc;
  }, {});

  const top5Entidades = Object.entries(porEntidad)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([nombre, total]) => ({
      nombre: nombre.length > 20 ? nombre.slice(0, 20) + "…" : nombre,
      total,
    }));

  // Gráfico por estado
  const porEstado = documentos.reduce<Record<string, number>>((acc, doc) => {
    const est = doc.estado || "Sin estado";
    acc[est] = (acc[est] ?? 0) + 1;
    return acc;
  }, {});

  const datosEstado = Object.entries(porEstado).map(([name, value]) => ({
    name,
    value,
  }));

  const estadosUnicos = [
    ...new Set(documentos.map((doc) => doc.estado).filter(Boolean)),
  ];

  const ANOS = Array.from({ length: 5 }, (_, i) =>
    String(now.getFullYear() - i)
  );

  const tituloTipo = activeTab === "ventas" ? "Ventas" : "Compras";
  const entidadLabel = activeTab === "ventas" ? "Cliente" : "Proveedor";
  const entidadLabelPlural =
    activeTab === "ventas" ? "clientes" : "proveedores";

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-cyan-50">
      <div className="mx-auto mt-4 w-full max-w-screen-2xl px-3 pb-10 pt-16 sm:mt-8 sm:px-6 sm:pt-6 lg:px-8">
        {/* ===== HEADER ===== */}
        <section className="rounded-2xl border border-cyan-200 bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50">
                <BarChartOutlined className="text-xl text-cyan-600" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Facturas SII
                </h1>
                <p className="text-sm text-slate-500">
                  Registro de Compras y Ventas — datos en tiempo real
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tabs */}
              <div className="flex rounded-full border border-cyan-200 bg-cyan-50 p-1">
                {(["ventas", "compras"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setBusqueda("");
                      setFiltroEstado("");
                    }}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${activeTab === tab
                      ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-cyan-700"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Empresa */}
              <div className="flex rounded-full border border-cyan-200 bg-cyan-50 p-1">
                {(["econnet", "rids"] as const).map((emp) => (
                  <button
                    key={emp}
                    onClick={() => setEmpresa(emp)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase transition ${empresa === emp
                      ? "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-cyan-700"
                      }`}
                  >
                    {emp}
                  </button>
                ))}
              </div>

              {/* Mes */}
              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="rounded-full border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {MESES.map((m, i) => (
                  <option key={i} value={String(i + 1).padStart(2, "0")}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Año */}
              <select
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                className="rounded-full border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {ANOS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>

              <button
                onClick={() => fetchDatos(true)}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white px-4 py-2 text-sm text-cyan-700 transition hover:bg-cyan-50 disabled:opacity-50"
              >
                <ReloadOutlined className={loading ? "animate-spin" : ""} />
                {loading ? "Cargando…" : "Recargar"}
              </button>
            </div>
          </div>

          {/* Período activo */}
          <div className="mt-4 flex items-center gap-2">
            <CalendarOutlined className="text-cyan-500" />

            <span className="text-sm font-medium text-slate-600">
              Período:{" "}
              <span className="font-semibold text-cyan-700">
                {MESES[parseInt(mes) - 1]} {ano}
              </span>

              <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold uppercase text-indigo-700">
                {empresa}
              </span>

              <span className="ml-2 rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold uppercase text-cyan-700">
                {tituloTipo}
              </span>

              {datos && (
                <span className="ml-2 text-slate-400">
                  — {totalDocs} documentos encontrados
                </span>
              )}
            </span>

            {loading && (
              <span className="ml-2 rounded-full bg-cyan-100 px-2 py-0.5 text-xs text-cyan-700">
                Consultando SII…
              </span>
            )}
          </div>
        </section>

        {/* ===== MÉTRICAS ===== */}
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            titulo="Total Bruto"
            valor={loading ? "—" : formatCLP(totalBruto)}
            subtitulo="IVA incluido"
            icono={<DollarOutlined className="text-lg text-emerald-600" />}
            color="border border-emerald-100 bg-emerald-50"
          />

          <MetricCard
            titulo="Neto"
            valor={loading ? "—" : formatCLP(totalNeto)}
            subtitulo="Sin IVA"
            icono={<BarChartOutlined className="text-lg text-cyan-600" />}
            color="border border-cyan-100 bg-cyan-50"
          />

          <MetricCard
            titulo="IVA"
            valor={loading ? "—" : formatCLP(totalIVA)}
            subtitulo="19%"
            icono={<FileTextOutlined className="text-lg text-indigo-600" />}
            color="border border-indigo-100 bg-indigo-50"
          />

          <MetricCard
            titulo="Documentos"
            valor={loading ? "—" : String(totalDocs)}
            subtitulo="total del período"
            icono={<FileTextOutlined className="text-lg text-slate-600" />}
            color="border border-slate-200 bg-slate-50"
          />

          <MetricCard
            titulo="Confirmadas"
            valor={loading ? "—" : String(confirmadas)}
            icono={
              <CheckCircleOutlined className="text-lg text-emerald-600" />
            }
            color="border border-emerald-100 bg-emerald-50"
          />

          <MetricCard
            titulo="Pendientes"
            valor={loading ? "—" : String(pendientes)}
            icono={<ClockCircleOutlined className="text-lg text-amber-600" />}
            color="border border-amber-100 bg-amber-50"
          />
        </section>

        {/* ===== GRÁFICOS ===== */}
        {!loading && documentos.length > 0 && (
          <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
            {/* Línea por día */}
            <div className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm xl:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">
                {tituloTipo} por día
              </h2>

              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={datosGraficoDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      `$${(Number(v) / 1000000).toFixed(1)}M`
                    }
                  />
                  <Tooltip
                    formatter={
                      ((v: unknown) =>
                        typeof v === "number"
                          ? formatCLP(v)
                          : String(v ?? "")) as any
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#0891b2"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pie por estado */}
            <div className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">
                Estado documentos
              </h2>

              {datosEstado.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={datosEstado}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      dataKey="value"
                      label={(props: any) => {
                        const name = String(props?.name ?? "");
                        const percent = Number(props?.percent ?? 0);
                        return `${name} ${(percent * 100).toFixed(0)}%`;
                      }}
                      labelLine={false}
                    >
                      {datosEstado.map((_, i) => (
                        <Cell
                          key={i}
                          fill={COLORES_GRAFICO[i % COLORES_GRAFICO.length]}
                        />
                      ))}
                    </Pie>

                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
                  Sin datos
                </div>
              )}
            </div>

            {/* Barras top clientes/proveedores */}
            <div className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm xl:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">
                Top 5 {entidadLabelPlural} por monto
              </h2>

              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={top5Entidades} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      `$${(Number(v) / 1000000).toFixed(1)}M`
                    }
                  />

                  <YAxis
                    type="category"
                    dataKey="nombre"
                    tick={{ fontSize: 11 }}
                    width={160}
                  />

                  <Tooltip
                    formatter={(v: unknown) =>
                      typeof v === "number" ? formatCLP(v) : String(v ?? "")
                    }
                  />

                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {top5Entidades.map((_, i) => (
                      <Cell
                        key={i}
                        fill={COLORES_GRAFICO[i % COLORES_GRAFICO.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ===== TABLA ===== */}
        <section className="mt-6">
          <div className="overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-sm">
            {/* Header tabla */}
            <div className="flex flex-col gap-3 border-b border-cyan-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <FileTextOutlined className="text-cyan-600" />

                <span className="text-sm font-semibold capitalize text-slate-700">
                  {activeTab} — {MESES[parseInt(mes) - 1]} {ano}
                </span>

                {!loading && (
                  <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs text-cyan-700">
                    {documentosFiltrados.length} de {totalDocs}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Búsqueda */}
                <div className="relative">
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder={`Buscar ${entidadLabel.toLowerCase()}, folio o RUT...`}
                    className="w-64 rounded-full border border-cyan-100 bg-white py-2 pl-4 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>

                {/* Filtro estado */}
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="rounded-full border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  <option value="">Todos los estados</option>
                  {estadosUnicos.map((e) => (
                    <option key={e}>{e}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
                <p className="text-sm text-slate-500">
                  Consultando el SII… esto puede tardar hasta 2 minutos
                </p>
              </div>
            )}

            {/* Sin datos */}
            {!loading && documentos.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
                <FileTextOutlined className="text-4xl" />
                <p className="text-sm">
                  No hay documentos para {MESES[parseInt(mes) - 1]} {ano}
                </p>
              </div>
            )}

            {/* Tabla desktop */}
            {!loading && documentosFiltrados.length > 0 && (
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] divide-y divide-gray-200">
                  <thead className="bg-cyan-50">
                    <tr>
                      {[
                        "Folio",
                        "Tipo DTE",
                        "Fecha Emisión",
                        entidadLabel,
                        "RUT",
                        "Neto",
                        "IVA",
                        "Total",
                        "Estado",
                        "Acción",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-center text-xs font-semibold text-slate-600"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {documentosFiltrados.map((doc, i) => {
                      const nombre = getNombreDocumento(doc, activeTab);
                      const rut = getRutDocumento(doc, activeTab);

                      return (
                        <tr key={i} className="transition hover:bg-cyan-50">
                          <td className="px-4 py-3 text-center text-sm font-semibold text-cyan-700">
                            {doc.folio}
                          </td>

                          <td className="px-4 py-3 text-center text-xs text-slate-500">
                            {getTipoDocumentoTexto(doc)}
                          </td>

                          <td className="px-4 py-3 text-center text-sm text-slate-600">
                            {doc.fechaEmision
                              ? new Date(
                                doc.fechaEmision
                              ).toLocaleDateString("es-CL")
                              : "—"}
                          </td>

                          <td className="max-w-[200px] truncate px-4 py-3 text-left text-sm font-medium text-slate-800">
                            {nombre || "—"}
                          </td>

                          <td className="px-4 py-3 text-center text-xs text-slate-500">
                            {rut || "—"}
                          </td>

                          <td className="px-4 py-3 text-right text-sm text-slate-700">
                            {formatCLP(doc.montoNeto)}
                          </td>

                          <td className="px-4 py-3 text-right text-sm text-slate-500">
                            {formatCLP(doc.montoIVA)}
                          </td>

                          <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                            {formatCLP(doc.montoTotal)}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <BadgeEstado estado={doc.estado} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setDocumentoSeleccionado(doc)}
                                className="rounded-full border border-cyan-200 px-3 py-1 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-50"
                              >
                                Ver detalle
                              </button>

                              <button
                                onClick={() => handleGenerarPDF(doc)}
                                disabled={pdfLoading}
                                className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                              >
                                PDF
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mobile cards */}
            {!loading && documentosFiltrados.length > 0 && (
              <div className="block divide-y divide-cyan-100 md:hidden">
                {documentosFiltrados.map((doc, i) => {
                  const nombre = getNombreDocumento(doc, activeTab);
                  const rut = getRutDocumento(doc, activeTab);

                  return (
                    <div key={i} className="px-4 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-base font-bold text-cyan-700">
                            Folio {doc.folio}
                          </span>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {doc.fechaEmision
                              ? new Date(
                                doc.fechaEmision
                              ).toLocaleDateString("es-CL")
                              : "—"}
                          </p>
                        </div>

                        <BadgeEstado estado={doc.estado} />
                      </div>

                      <p className="mt-2 text-sm font-medium text-slate-800">
                        {nombre || "—"}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {rut || "—"}
                      </p>

                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-slate-500">
                          Neto: {formatCLP(doc.montoNeto)}
                        </span>

                        <span className="font-bold text-slate-900">
                          {formatCLP(doc.montoTotal)}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setDocumentoSeleccionado(doc)}
                          className="w-full rounded-xl border border-cyan-200 px-3 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-50"
                        >
                          Ver detalle
                        </button>

                        <button
                          onClick={() => handleGenerarPDF(doc)}
                          disabled={pdfLoading}
                          className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                        >
                          PDF
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer tabla */}
            {!loading && documentosFiltrados.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-cyan-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-slate-500">
                  {documentosFiltrados.length} documentos · Total:{" "}
                  <span className="font-bold text-slate-900">
                    {formatCLP(
                      documentosFiltrados.reduce(
                        (s, doc) => s + doc.montoTotal,
                        0
                      )
                    )}
                  </span>
                </span>

                <div className="flex gap-4 text-xs text-slate-500">
                  <span>
                    Neto:{" "}
                    <b className="text-slate-700">
                      {formatCLP(
                        documentosFiltrados.reduce(
                          (s, doc) => s + doc.montoNeto,
                          0
                        )
                      )}
                    </b>
                  </span>

                  <span>
                    IVA:{" "}
                    <b className="text-slate-700">
                      {formatCLP(
                        documentosFiltrados.reduce(
                          (s, doc) => s + doc.montoIVA,
                          0
                        )
                      )}
                    </b>
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <DetalleDocumentoModal
        documento={documentoSeleccionado}
        activeTab={activeTab}
        onClose={() => setDocumentoSeleccionado(null)}
        onGenerarPDF={handleGenerarPDF}
        pdfLoading={pdfLoading}
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed left-3 right-3 top-3 z-[99999] flex items-center gap-3 rounded-xl px-4 py-3 text-white shadow-xl sm:left-auto sm:right-5 sm:top-5 ${toast.type === "success" ? "bg-green-600" : "bg-rose-600"
            }`}
        >
          {toast.type === "success" ? (
            <CheckCircleOutlined className="text-xl" />
          ) : (
            <CloseCircleOutlined className="text-xl" />
          )}

          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default FacturasDashboard;