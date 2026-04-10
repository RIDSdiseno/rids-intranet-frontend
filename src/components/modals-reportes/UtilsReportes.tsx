// utils/reportes.utils.ts
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
import type { VisitaRow, TicketRow } from "./typesReportes";

Chart.register(
    CategoryScale, LinearScale, BarElement, BarController,
    ArcElement, PieController, LineController, LineElement,
    PointElement, Tooltip, Legend
);

// ─── Config ───────────────────────────────────────────────────────────────

export const CHART_CONFIG = {
    colors: {
        primary: "#2563EB",
        secondary: "#10B981",
        accent: "#F59E0B",
        danger: "#EF4444",
        warning: "#F59E0B",
        gray: "#6B7280",
        purple: "#8B5CF6",
        pink: "#EC4899",
        indigo: "#4F46E5",
        teal: "#14B8A6",
    },
    fonts: {
        size: 14,
        family: "Inter, system-ui, -apple-system, sans-serif",
    },
};

export const TEXTO_FIJO = {
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
        "Mantenimientos preventivos a equipos de usuarios (laptops y desktops).",
        "Emisión de informes mensuales con solicitudes e incidencias gestionadas.",
    ],
    resultados: [
        "Todas las incidencias registradas en el periodo fueron gestionadas en el HelpDesk.",
        "Se detalla más abajo la distribución por categoría y tiempos de resolución estimados.",
    ],
    correo: "soporte@rids.cl",
    folio: "Folio: —",
};

// ─── Helpers booleanos ─────────────────────────────────────────────────────

export const asBool = (v: unknown) => v === true || v === 1 || v === "1";

export const generarFolio = (empresa: string) => {
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `Folio: ${empresa}-${fecha}`;
};

// ─── Contadores ────────────────────────────────────────────────────────────

export const contarMantenimientos = (visitas: VisitaRow[]) => {
    let rendimientoEquipo = 0, ccleaner = 0, actualizaciones = 0,
        licenciaOffice = 0, antivirus = 0, licenciaWindows = 0,
        estadoDisco = 0, mantenimientoReloj = 0;

    for (const v of visitas) {
        if (asBool(v.rendimientoEquipo)) rendimientoEquipo++;
        if (asBool(v.ccleaner)) ccleaner++;
        if (asBool(v.actualizaciones)) actualizaciones++;
        if (asBool(v.licenciaOffice)) licenciaOffice++;
        if (asBool(v.antivirus)) antivirus++;
        if (asBool(v.licenciaWindows)) licenciaWindows++;
        if (asBool(v.estadoDisco)) estadoDisco++;
        if (asBool(v.mantenimientoReloj)) mantenimientoReloj++;
    }

    return [
        { Ítem: "Rendimiento del equipo", Cantidad: rendimientoEquipo },
        { Ítem: "CCleaner", Cantidad: ccleaner },
        { Ítem: "Actualizaciones", Cantidad: actualizaciones },
        { Ítem: "Licencia office", Cantidad: licenciaOffice },
        { Ítem: "Antivirus", Cantidad: antivirus },
        { Ítem: "Licencia Windows", Cantidad: licenciaWindows },
        { Ítem: "Estado del disco", Cantidad: estadoDisco },
        { Ítem: "Mantenimiento del reloj", Cantidad: mantenimientoReloj },
    ];
};

export const contarExtras = (visitas: VisitaRow[]) => {
    let impresoras = 0, telefonos = 0, pie = 0, otros = 0;
    const detMap = new Map<string, number>();

    for (const v of visitas) {
        if (asBool(v.confImpresoras)) impresoras++;
        if (asBool(v.confTelefonos)) telefonos++;
        if (asBool(v.confPiePagina)) pie++;
        if (asBool(v.otros)) {
            otros++;
            const det = (v.otrosDetalle ?? "—").trim() || "—";
            detMap.set(det, (detMap.get(det) || 0) + 1);
        }
    }

    return {
        totales: [
            { Ítem: "Impresoras", Cantidad: impresoras },
            { Ítem: "Teléfonos", Cantidad: telefonos },
            { Ítem: "Pie de página", Cantidad: pie },
            { Ítem: "Otros", Cantidad: otros },
        ],
        detalles: Array.from(detMap.entries()).map(([Detalle, Cantidad]) => ({
            Detalle,
            Cantidad,
        })),
    };
};

export const tieneMantenimiento = (v: VisitaRow) =>
    asBool(v.rendimientoEquipo) || asBool(v.ccleaner) ||
    asBool(v.actualizaciones) || asBool(v.licenciaOffice) ||
    asBool(v.antivirus) || asBool(v.licenciaWindows) ||
    asBool(v.estadoDisco) || asBool(v.mantenimientoReloj);

export const contarTiposVisita = (visitas: VisitaRow[]) => {
    let programadas = 0, adicionales = 0;

    for (const v of visitas) {
        const rawTipo = (v.tipo ?? "").trim().toLowerCase();
        const rawOtros = (v.otrosDetalle ?? "").trim().toLowerCase();
        const rawStatus = (v.status ?? "").trim().toLowerCase();
        let esProgramada = false;

        if (rawTipo.includes("program")) esProgramada = true;
        else if (rawOtros.includes("program") || rawOtros.includes("mantención programada")) esProgramada = true;
        else if (v.actualizaciones || v.antivirus || v.ccleaner || v.estadoDisco || v.mantenimientoReloj || v.rendimientoEquipo) esProgramada = true;
        else if (rawStatus.includes("pendiente") || rawStatus.includes("completada")) esProgramada = false;

        if (esProgramada) programadas++;
        else adicionales++;
    }

    return [
        { Tipo: "Solicitud Programada", Cantidad: programadas },
        { Tipo: "Solicitudes adicionales", Cantidad: adicionales },
    ];
};

export const contarMantenimientosPorFecha = (visitas: VisitaRow[]) => {
    const map = new Map<string, number>();

    for (const v of visitas) {
        if (!tieneMantenimiento(v) || !v.inicio) continue;
        const d = new Date(v.inicio);
        if (Number.isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        map.set(key, (map.get(key) || 0) + 1);
    }

    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([iso, Cantidad]) => ({
            Fecha: iso.split("-").reverse().join("-"),
            Cantidad,
        }));
};

export const contarMantenimientosPorUsuario = (visitas: VisitaRow[]) => {
    const map: Record<string, number> = {};
    for (const v of visitas) {
        if (!tieneMantenimiento(v)) continue;
        const usuario = v.solicitante ?? v.solicitanteRef?.nombre ?? "Sin usuario";
        map[usuario] = (map[usuario] || 0) + 1;
    }
    return Object.entries(map)
        .map(([Usuario, Cantidad]) => ({ Usuario, Cantidad }))
        .sort((a, b) => b.Cantidad - a.Cantidad);
};

export const calcularTendenciasMensuales = (
    visitas: VisitaRow[],
    tickets: TicketRow[]
) => {
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const visitasPorMes = Array(12).fill(0);
    const ticketsPorMes = Array(12).fill(0);

    visitas.forEach((v) => {
        if (v.inicio) visitasPorMes[new Date(v.inicio).getMonth()]++;
    });
    tickets.forEach((t) => {
        ticketsPorMes[new Date(t.fecha).getMonth()]++;
    });

    return {
        labels: meses,
        datasets: [
            { label: "Visitas Técnicas", data: visitasPorMes, color: CHART_CONFIG.colors.primary },
            { label: "Tickets", data: ticketsPorMes, color: CHART_CONFIG.colors.secondary },
        ],
    };
};

export const calcularDistribucionServicios = (visitas: VisitaRow[]) => ({
    labels: ["Mantenimiento", "Configuración", "Soporte General"],
    data: [
        contarMantenimientos(visitas).reduce((s, i) => s + i.Cantidad, 0),
        contarExtras(visitas).totales.reduce((s, i) => s + i.Cantidad, 0),
        visitas.length,
    ],
});

export const obtenerTopUsuariosGeneral = (
    visitas: VisitaRow[],
    tickets: TicketRow[]
) => {
    const conteo: Record<string, number> = {};

    visitas.forEach((v) => {
        const user = v.solicitante ?? v.solicitanteRef?.nombre ?? "(Sin nombre)";
        conteo[user] = (conteo[user] || 0) + 1;
    });
    tickets.forEach((t) => {
        const user = t.solicitante_email ?? "(Sin correo)";
        conteo[user] = (conteo[user] || 0) + 1;
    });

    return Object.entries(conteo)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([Usuario, Solicitudes]) => ({ Usuario, Solicitudes }));
};

// ─── Chart generators ──────────────────────────────────────────────────────

export const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
    const base64 = dataUrl.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
};

const TICK_COLOR = "#ccd0d8ff";

export const generateBarChart = async (
    canvasId: string,
    labels: string[],
    data: number[],
    title: string,
    color: string = CHART_CONFIG.colors.primary
): Promise<string | null> => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: title, data,
                backgroundColor: `${color}CC`, borderColor: color,
                borderWidth: 1, borderRadius: 6, barPercentage: 0.7,
            }],
        },
        options: {
            responsive: false, maintainAspectRatio: false, animation: false,
            plugins: {
                legend: { display: true, position: "top", labels: { font: { size: 14 }, color: TICK_COLOR } },
                title: { display: true, text: title, font: { size: 16, weight: "bold" }, color: TICK_COLOR, padding: 20 },
                tooltip: { backgroundColor: "rgba(255,255,255,0.95)", titleColor: "#111827", bodyColor: "#374151", borderColor: "#E5E7EB", borderWidth: 1, cornerRadius: 6 },
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: TICK_COLOR, maxRotation: 45, minRotation: 0 } },
                y: { beginAtZero: true, grid: { color: "#F3F4F6" }, ticks: { color: TICK_COLOR, precision: 0 } },
            },
        },
    });

    await new Promise((r) => setTimeout(r, 100));
    const url = canvas.toDataURL("image/png", 1.0);
    chart.destroy();
    return url;
};

export const generatePieChart = async (
    canvasId: string,
    labels: string[],
    data: number[],
    title: string
): Promise<string | null> => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const chart = new Chart(ctx, {
        type: "pie",
        data: {
            labels,
            datasets: [{
                label: title, data,
                backgroundColor: [
                    CHART_CONFIG.colors.primary, CHART_CONFIG.colors.secondary,
                    CHART_CONFIG.colors.accent, CHART_CONFIG.colors.danger,
                    CHART_CONFIG.colors.purple, CHART_CONFIG.colors.pink,
                ],
                borderColor: "#FFFFFF", borderWidth: 2,
            }],
        },
        options: {
            responsive: false, maintainAspectRatio: false, animation: false,
            plugins: {
                legend: { display: true, position: "bottom", labels: { font: { size: 12 }, color: "#d2d8e0ff", padding: 20 } },
                title: { display: true, text: title, font: { size: 16, weight: "bold" }, color: TICK_COLOR, padding: 20 },
                tooltip: { backgroundColor: "rgba(255,255,255,0.95)", titleColor: "#111827", bodyColor: "#374151", borderColor: "#E5E7EB", borderWidth: 1, cornerRadius: 6 },
            },
        },
    });

    await new Promise((r) => setTimeout(r, 100));
    const url = canvas.toDataURL("image/png", 1.0);
    chart.destroy();
    return url;
};

export const generateLineChart = async (
    canvasId: string,
    labels: string[],
    datasets: { label: string; data: number[]; color: string }[],
    title: string
): Promise<string | null> => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const chart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: datasets.map((ds) => ({
                label: ds.label, data: ds.data,
                borderColor: ds.color, backgroundColor: `${ds.color}20`,
                tension: 0.4, fill: true, borderWidth: 3,
                pointBackgroundColor: ds.color, pointBorderColor: "#FFFFFF",
                pointBorderWidth: 2, pointRadius: 5,
            })),
        },
        options: {
            responsive: false, maintainAspectRatio: false, animation: false,
            plugins: {
                legend: { display: true, position: "top", labels: { font: { size: 14 }, color: "#d2d8e0ff" } },
                title: { display: true, text: title, font: { size: 16, weight: "bold" } },
                tooltip: { mode: "index", intersect: false },
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: "#FFFFFF" } },
                y: { beginAtZero: true, grid: { color: "#F3F4F6" } },
            },
        },
    });

    await new Promise((r) => setTimeout(r, 100));
    const url = canvas.toDataURL("image/png", 1.0);
    chart.destroy();
    return url;
};