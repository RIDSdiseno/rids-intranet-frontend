import React, { useMemo, useState } from "react";
import XlsxPopulate from "xlsx-populate/browser/xlsx-populate";
import {
    CloseCircleFilled,
    DownloadOutlined,
    LoadingOutlined,
} from "@ant-design/icons";
import { http } from "../../service/http";
import type { VisitaDetail } from "./VisitaDetailModal";
import type { TecnicoMini, EmpresaMini } from "./CreateVisitaModal";

/* ========= Tipado mínimo para xlsx-populate ========= */

type ValueT = string | number | boolean | Date | null | undefined;

interface Styled {
    style(s: Record<string, ValueT>): this;
}

interface CellLike extends Styled {
    value(): ValueT;
    value(v: ValueT): this;
    relativeCell(dr: number, dc: number): CellLike;
}

interface ColumnLike {
    width(w: number): void;
}

interface RowLike {
    height(h: number): void;
}

interface RangeLike extends Styled {
    merged(): boolean;
    merged(m: boolean): this;
}

interface WorksheetLike {
    cell(a1: string): CellLike;
    cell(r: number, c: number): CellLike;
    column(iOrLetter: number | string): ColumnLike;
    row(i: number): RowLike;
    range(r1: number, c1: number, r2: number, c2: number): RangeLike;
    name(): string;
    name(n: string): void;
    freezePanes?(r: number, c: number): void;
}

interface WorkbookLike {
    sheet(name: string): WorksheetLike | undefined;
    sheet(index: number): WorksheetLike | undefined;
    sheets(): WorksheetLike[];
    addSheet(name: string): WorksheetLike;
    deleteSheet(sheet: WorksheetLike | string): WorkbookLike;
    outputAsync(): Promise<ArrayBuffer>;
}

/* ========= Domain ========= */

type ApiList<T> = {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    items: T[];
};

type VisitaRow = VisitaDetail & {
    empresa?: { id_empresa: number; nombre: string } | null;
    tecnico?: { id_tecnico: number; nombre: string } | null;
    solicitanteRef?: { id_solicitante: number; nombre: string } | null;
    direccion_visita?: string | null;
    sucursal?: { id_sucursal: number; nombre: string } | null;
};

/* ========= Config ========= */

type ViteEnv = {
    env?: {
        VITE_API_URL?: string;
        BASE_URL?: string;
    };
};

const API_URL =
    ((import.meta as unknown) as ViteEnv).env?.VITE_API_URL ||
    "http://localhost:4000/api";

const BASE_URL =
    ((import.meta as unknown) as ViteEnv).env?.BASE_URL || "/";

/* ========= Utils ========= */

function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

const toSiNo = (v?: boolean) => (v ? "Sí" : "No");

function ymd(dateIso: string): string {
    const d = new Date(dateIso);
    return `${String(d.getDate()).padStart(2, "0")}-${String(
        d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
}

function incCounter(map: Map<string, number>, key: string) {
    map.set(key, (map.get(key) ?? 0) + 1);
}

function asTrue(v: unknown): boolean {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v === 1;

    if (typeof v === "string") {
        const s = v.trim().toLowerCase();
        return s === "sí" || s === "si" || s === "true" || s === "1";
    }

    return false;
}

type Row2D = Array<string | number>;

const COUNT_ONLY_COMPLETADAS = false;

function isElegible(row: VisitaRow) {
    return COUNT_ONLY_COMPLETADAS
        ? (row.status || "").toUpperCase() === "COMPLETADA"
        : true;
}

function anyProgramada(v: VisitaRow) {
    return (
        asTrue(v.rendimientoEquipo) ||
        asTrue(v.ccleaner) ||
        asTrue(v.actualizaciones) ||
        asTrue(v.licenciaOffice) ||
        asTrue(v.antivirus) ||
        asTrue(v.licenciaWindows) ||
        asTrue(v.estadoDisco) ||
        asTrue(v.mantenimientoReloj)
    );
}

function anyAdicional(v: VisitaRow) {
    return (
        asTrue(v.confImpresoras) ||
        asTrue(v.confTelefonos) ||
        asTrue(v.confPiePagina) ||
        asTrue(v.otros)
    );
}

function aggregateForResumen(items: Array<VisitaRow>) {
    const pool = items.filter(isElegible);

    const byDay = new Map<string, number>();
    for (const v of pool) incCounter(byDay, ymd(v.inicio));

    const daily: Row2D[] = Array.from(byDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([d, c]) => [d, c]);

    const checklist: Row2D[] = [
        ["Rendimiento del equipo", pool.filter((x) => asTrue(x.rendimientoEquipo)).length],
        ["CCleaner", pool.filter((x) => asTrue(x.ccleaner)).length],
        ["Actualizaciones", pool.filter((x) => asTrue(x.actualizaciones)).length],
        ["Licencia office", pool.filter((x) => asTrue(x.licenciaOffice)).length],
        ["Antivirus", pool.filter((x) => asTrue(x.antivirus)).length],
        ["Licencia Windows", pool.filter((x) => asTrue(x.licenciaWindows)).length],
        ["Estado del disco", pool.filter((x) => asTrue(x.estadoDisco)).length],
        ["Mantenimiento del reloj", pool.filter((x) => asTrue(x.mantenimientoReloj)).length],
    ];

    const pie: Row2D[] = [
        ["Solicitudes adicionales", pool.filter(anyAdicional).length],
        ["Solicitud Programada", pool.filter(anyProgramada).length],
    ];

    const bySolicitanteAll = new Map<string, number>();

    const byEmpresa = new Map<string, number>();

    for (const v of pool) {
        const empresaNombre =
            v.empresa?.nombre ??
            (v.empresaId ? `#${v.empresaId}` : "Sin empresa");

        incCounter(byEmpresa, empresaNombre);
    }

    for (const v of pool) {
        incCounter(
            bySolicitanteAll,
            v.solicitanteRef?.nombre ?? v.solicitante ?? "No especificado"
        );
    }

    const topSolicitantesRows: Row2D[] = Array.from(bySolicitanteAll.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 10)
        .map(([u, n]) => [u, n]);

    const topEmpresasRows: Row2D[] = Array.from(byEmpresa.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 10)
        .map(([empresa, n]) => [empresa, n]);

    return {
        daily,
        checklist,
        pie,
        topSolicitantesRows,
        topEmpresasRows,
    };
}

function deleteSheetIfExists(wb: WorkbookLike, name: string) {
    const ws = wb.sheet(name);
    if (!ws) return;

    const totalSheets = wb.sheets().length;

    // Excel no permite eliminar la última hoja visible del libro.
    if (totalSheets <= 1) {
        console.warn(`[Export Excel] No se puede eliminar ${name}: es la única hoja del libro.`);
        return;
    }

    try {
        wb.deleteSheet(ws);
    } catch (error) {
        console.warn(`[Export Excel] No se pudo eliminar la hoja ${name}:`, error);
    }
}

const asPairs = (rows: Row2D[]) =>
    rows.map((r) => [String(r[0]), Number(r[1] || 0)] as [string, number]);

/* ========= Excel helpers ========= */

const HEADER = [
    "ID",
    "Técnico",
    "Empresa",
    "Solicitante",
    "Inicio",
    "Fin",
    "Estado",
    "Impresoras",
    "Teléfonos",
    "Pie de página",
    "Otros",
    "Detalle otros",
    "Actualizaciones",
    "Antivirus",
    "CCleaner",
    "Estado disco",
    "Lic. Office",
    "Lic. Windows",
    "Mant. reloj",
    "Rend. equipo",
] as const;

const PALETTE = [
    "D9F99D",
    "E0F2FE",
    "FDE68A",
    "FBCFE8",
    "FCA5A5",
    "DDD6FE",
    "A7F3D0",
    "FDE2E2",
    "FFE4E6",
    "F5F5F4",
];

function colorFor(key: string): string {
    let h = 0;
    for (let i = 0; i < key.length; i++) {
        h = (h * 31 + key.charCodeAt(i)) >>> 0;
    }
    return PALETTE[h % PALETTE.length];
}

const COLOR_BORDER = "111827";
const COLOR_TEXT = "111827";
const COLOR_HEADER_TEXT = "0B4266";

function setAllBorders(
    ws: WorksheetLike,
    r1: number,
    c1: number,
    r2: number,
    c2: number
) {
    ws.range(r1, c1, r2, c2).style({
        border: true,
        borderColor: COLOR_BORDER,
    });
}

function fillBlock(
    ws: WorksheetLike,
    startCellA1: string,
    rows: Array<[string, number]>,
    maxRows = 2000
) {
    const start = ws.cell(startCellA1);
    const n = Math.min(rows.length, maxRows);

    for (let i = 0; i < maxRows; i++) {
        if (i >= n) {
            start.relativeCell(i, 0).value(null);
            start.relativeCell(i, 1).value(null);
        }
    }

    for (let i = 0; i < n; i++) {
        start.relativeCell(i, 0).value(rows[i][0]);
        start.relativeCell(i, 1).value(rows[i][1]);
    }
}

function excelColWidthSetup(ws: WorksheetLike) {
    const widths = [
        8, 22, 26, 30, 22, 22, 14, 12, 12, 14,
        10, 36, 14, 12, 10, 14, 14, 14, 14, 14,
    ];

    widths.forEach((w, i) => ws.column(i + 1).width(w));
}

function safeSheetName(raw: string) {
    const base = (raw || "Empresa")
        .replace(/[\\/:*?"[\]]/g, "_")
        .slice(0, 31);

    return base.length ? base : "Empresa";
}

function ensureUniqueSheetName(wb: WorkbookLike, desired: string) {
    let name = desired;
    let i = 2;

    while (wb.sheet(name)) {
        const s = `_${i}`;
        name = (desired.slice(0, 31 - s.length) + s).replace(
            /[\\/:*?"[\]]/g,
            "_"
        );
        i++;
    }

    return name;
}

function addDetallePorEmpresaSheets(wb: WorkbookLike, items: VisitaRow[]) {
    const byEmpresa = new Map<string, VisitaRow[]>();

    for (const v of items) {
        const emp = v.empresa?.nombre ?? `#${v.empresaId}`;
        const key = emp || "Sin empresa";
        (byEmpresa.get(key) ?? byEmpresa.set(key, []).get(key)!)!.push(v);
    }

    for (const [empresa, rows] of byEmpresa.entries()) {
        const ws = wb.addSheet(ensureUniqueSheetName(wb, safeSheetName(empresa)));

        ws.cell("A1").value(`Visitas — ${empresa}`).style({
            bold: true,
            fontFamily: "Calibri",
            fontSize: 16,
            fontColor: COLOR_HEADER_TEXT,
            horizontalAlignment: "center",
            verticalAlignment: "center",
            fill: colorFor(empresa),
        });

        ws.range(1, 1, 1, HEADER.length).merged(true);
        ws.row(1).height(28);

        for (let c = 0; c < HEADER.length; c++) {
            ws.cell(3, c + 1).value(HEADER[c]).style({
                bold: true,
                fontFamily: "Calibri",
                fontSize: 11,
                fontColor: COLOR_HEADER_TEXT,
                fill: "F1F5F9",
                horizontalAlignment: "left",
                verticalAlignment: "center",
            });
        }

        ws.row(3).height(22);

        let r = 4;
        const startRow = r;
        const endCol = HEADER.length;

        for (const v of rows) {
            const tecnico = v.tecnico?.nombre ?? `#${v.tecnicoId}`;
            const solicitante = v.solicitanteRef?.nombre ?? v.solicitante ?? "—";
            const started = v.inicio ? new Date(v.inicio) : null;
            const ended = v.fin ? new Date(v.fin) : null;

            const rowValues: ValueT[] = [
                v.id_visita,
                tecnico,
                empresa,
                solicitante,
                started,
                ended,
                v.status,
                toSiNo(v.confImpresoras),
                toSiNo(v.confTelefonos),
                toSiNo(v.confPiePagina),
                toSiNo(v.otros),
                v.otros ? v.otrosDetalle ?? "—" : "—",
                toSiNo(!!v.actualizaciones),
                toSiNo(!!v.antivirus),
                toSiNo(!!v.ccleaner),
                toSiNo(!!v.estadoDisco),
                toSiNo(!!v.licenciaOffice),
                toSiNo(!!v.licenciaWindows),
                toSiNo(!!v.mantenimientoReloj),
                toSiNo(!!v.rendimientoEquipo),
            ];

            for (let c = 0; c < rowValues.length; c++) {
                ws.cell(r, c + 1).value(rowValues[c]).style({
                    fontFamily: "Calibri",
                    fontSize: 11,
                    fontColor: COLOR_TEXT,
                    verticalAlignment: "center",
                });
            }

            if ((r - 4) % 2 === 1) {
                ws.range(r, 1, r, endCol).style({
                    fill: "F9FAFB",
                });
            }

            r++;
        }

        const endRow = Math.max(startRow, r - 1);
        excelColWidthSetup(ws);

        if (rows.length > 0) {
            ws.range(startRow, 5, endRow, 6).style({
                numberFormat: "dd-mm-yyyy HH:mm",
            });

            setAllBorders(ws, 3, 1, endRow, endCol);

            ws.range(1, 1, 1, endCol).style({
                border: true,
                borderColor: COLOR_BORDER,
            });
        }
    }
}

function setupResumenSheet(ws: WorksheetLike) {
    const hdr = {
        bold: true,
        fill: "F1F5F9",
        fontColor: COLOR_HEADER_TEXT,
        border: true,
        borderColor: COLOR_BORDER,
        horizontalAlignment: "center",
        verticalAlignment: "center",
    } as Record<string, ValueT>;

    ws.cell("A1").value("Fecha").style(hdr);
    ws.cell("B1").value("Cantidad").style(hdr);

    ws.cell("F1").value("Ítem").style(hdr);
    ws.cell("G1").value("Cantidad").style(hdr);

    ws.cell("K1").value("Tipo").style(hdr);
    ws.cell("L1").value("Cantidad").style(hdr);

    ws.cell("P1").value("Top 10 solicitantes").style(hdr);
    ws.cell("Q1").value("Cantidad").style(hdr);

    ws.cell("U1").value("Top 10 empresas").style(hdr);
    ws.cell("V1").value("Cantidad").style(hdr);

    ws.column("A").width(14);
    ws.column("B").width(10);
    ws.column("F").width(24);
    ws.column("G").width(10);
    ws.column("K").width(20);
    ws.column("L").width(10);
    ws.column("P").width(26);
    ws.column("Q").width(10);
    ws.column("U").width(28);
    ws.column("V").width(10);

    ws.range(2, 1, 2000, 1).style({ numberFormat: "dd-mm-yyyy" });
    ws.range(2, 2, 2000, 2).style({ numberFormat: "#,##0" });
    ws.range(2, 7, 2000, 7).style({ numberFormat: "#,##0" });
    ws.range(2, 12, 2000, 12).style({ numberFormat: "#,##0" });
    ws.range(2, 17, 2000, 17).style({ numberFormat: "#,##0" });
    ws.range(2, 22, 2000, 22).style({ numberFormat: "#,##0" });

    ws.freezePanes?.(2, 1);
}

function styleResumenBlocks(
    ws: WorksheetLike,
    s: {
        daily: number;
        checklist: number;
        pie: number;
        users: number;
        empresas: number;
    }
) {
    if (s.daily > 0) setAllBorders(ws, 1, 1, 1 + s.daily, 2);
    if (s.checklist > 0) setAllBorders(ws, 1, 6, 1 + s.checklist, 7);
    if (s.pie > 0) setAllBorders(ws, 1, 11, 1 + s.pie, 12);
    if (s.users > 0) setAllBorders(ws, 1, 16, 1 + s.users, 17);
    if (s.empresas > 0) setAllBorders(ws, 1, 21, 1 + s.empresas, 22);
}

async function loadTemplateArrayBuffer(): Promise<ArrayBuffer> {
    const tryFetch = async (url: string): Promise<ArrayBuffer | null> => {
        try {
            const resp = await fetch(url, { cache: "no-store" });
            if (!resp.ok) return null;

            const buf = await resp.arrayBuffer();
            const sig = new Uint8Array(buf.slice(0, 2));

            if (!(sig[0] === 0x50 && sig[1] === 0x4b)) return null;

            return buf;
        } catch {
            return null;
        }
    };

    const base = (BASE_URL || "/").replace(/\/+$/, "");

    const a = await tryFetch(`${base}/visitas_template.xlsx`);
    if (a) return a;

    const b = await tryFetch(`/visitas_template.xlsx`);
    if (b) return b;

    const c = await tryFetch(`/assets/visitas_template.xlsx`);
    if (c) return c;

    const wb = (await (
        XlsxPopulate as unknown as {
            fromBlankAsync(): Promise<WorkbookLike>;
        }
    ).fromBlankAsync()) as WorkbookLike;

    wb.addSheet("Resumen");

    return wb.outputAsync();
}

async function fetchAllVisitasForExport(params: {
    q: string;
    tecnicoId: number | "";
    empresaId: number | "";
    monthFilter: string;
    yearFilter: string;
}): Promise<VisitaRow[]> {
    const all: VisitaRow[] = [];
    let page = 1;
    const pageSize = 100;

    while (true) {
        const url = new URL(`${API_URL}/visitas`);

        url.searchParams.set("page", String(page));
        url.searchParams.set("pageSize", String(pageSize));

        if (params.q.trim()) url.searchParams.set("q", params.q.trim());
        if (params.tecnicoId) url.searchParams.set("tecnicoId", String(params.tecnicoId));
        if (params.empresaId) url.searchParams.set("empresaId", String(params.empresaId));
        if (params.monthFilter) url.searchParams.set("month", params.monthFilter);
        if (params.yearFilter) url.searchParams.set("year", params.yearFilter);

        url.searchParams.set("_ts", String(Date.now()));

        const res = await http.get(url.toString());
        const json = res.data as ApiList<VisitaRow>;
        const items = json.items ?? [];

        all.push(...items);

        const reachedEnd =
            page >= (json.totalPages ?? 1) ||
            all.length >= (json.total ?? all.length) ||
            items.length === 0;

        if (reachedEnd) break;

        page += 1;
    }

    return all;
}

/* ========= Component ========= */

type Props = {
    open: boolean;
    onClose: () => void;
    total: number;
    q: string;
    tecnicoId: number | "";
    empresaId: number | "";
    monthFilter: string;
    yearFilter: string;
    tecnicos: TecnicoMini[];
    empresas: EmpresaMini[];
};

export default function ExportVisitasExcelModal({
    open,
    onClose,
    total,
    q,
    tecnicoId,
    empresaId,
    monthFilter,
    yearFilter,
    tecnicos,
    empresas,
}: Props) {
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    const tecnicoNombre = useMemo(() => {
        if (!tecnicoId) return "Todos";

        return (
            tecnicos.find((t) => t.id === tecnicoId)?.nombre ??
            `#${tecnicoId}`
        );
    }, [tecnicoId, tecnicos]);

    const empresaNombre = useMemo(() => {
        if (!empresaId) return "Todas";

        return (
            empresas.find((e) => e.id === empresaId)?.nombre ??
            `#${empresaId}`
        );
    }, [empresaId, empresas]);

    const periodoLabel = useMemo(() => {
        if (monthFilter && yearFilter) return `${monthFilter}/${yearFilter}`;
        if (monthFilter) return `Mes ${monthFilter}`;
        if (yearFilter) return `Año ${yearFilter}`;
        return "Sin periodo específico";
    }, [monthFilter, yearFilter]);

    if (!open) return null;

    const downloadExcel = async () => {
        try {
            setExportError(null);

            if (total <= 0) {
                setExportError("No hay visitas para exportar con los filtros actuales.");
                return;
            }

            setExporting(true);

            const items = await fetchAllVisitasForExport({
                q,
                tecnicoId,
                empresaId,
                monthFilter,
                yearFilter,
            });

            const tplArrayBuf = await loadTemplateArrayBuffer();

            const wb = (await (
                XlsxPopulate as unknown as {
                    fromDataAsync(buf: ArrayBuffer): Promise<WorkbookLike>;
                }
            ).fromDataAsync(tplArrayBuf)) as WorkbookLike;

            // Primero crear o asegurar la hoja Resumen.
            // Esto evita que el workbook quede sin hojas visibles.
            let ws = wb.sheet("Resumen");
            if (!ws) {
                ws = wb.addSheet("Resumen");
            }

            setupResumenSheet(ws);

            const {
                daily,
                checklist,
                pie,
                topSolicitantesRows,
                topEmpresasRows,
            } = aggregateForResumen(items);

            fillBlock(ws, "A2", asPairs(daily), 2000);
            fillBlock(ws, "F2", asPairs(checklist), 2000);
            fillBlock(ws, "K2", asPairs(pie), 2000);

            // Top 10 solicitantes con más visitas
            fillBlock(ws, "P2", asPairs(topSolicitantesRows), 10);

            // Top 10 empresas con más visitas
            fillBlock(ws, "U2", asPairs(topEmpresasRows), 10);

            styleResumenBlocks(ws, {
                daily: daily.length,
                checklist: checklist.length,
                pie: pie.length,
                users: topSolicitantesRows.length,
                empresas: topEmpresasRows.length,
            });

            addDetallePorEmpresaSheets(wb, items);

            // Ahora sí, al final, cuando ya existen Resumen y hojas por empresa.
            deleteSheetIfExists(wb, "Hoja1");
            deleteSheetIfExists(wb, "Hoja5");

            const out = await wb.outputAsync();

            const blob = new Blob([out as ArrayBuffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            const empresaFile = empresaNombre.replace(/[\\/:*?"<>|]/g, "_");
            const periodoFile =
                monthFilter && yearFilter
                    ? `${yearFilter}-${monthFilter}`
                    : new Date().toISOString().slice(0, 10);

            const fileName = `Visitas_${empresaFile}_${periodoFile}.xlsx`;

            const urlBlob = URL.createObjectURL(blob);
            const a = document.createElement("a");

            a.href = urlBlob;
            a.download = fileName;

            document.body.appendChild(a);
            a.click();
            a.remove();

            URL.revokeObjectURL(urlBlob);
            onClose();
        } catch (e) {
            console.error("[Export Excel] Error:", e);
            setExportError(
                "No se pudo exportar el Excel. Revisa consola, plantilla, rutas o permisos."
            );
        } finally {
            setExporting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4"
            role="dialog"
            aria-modal="true"
        >
            <div className="w-full max-w-lg rounded-2xl border border-cyan-200 bg-white shadow-xl overflow-hidden">
                <div className="flex items-start justify-between gap-3 border-b border-cyan-100 px-5 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            Exportar visitas a Excel
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Se generará un archivo con resumen y hojas por empresa.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={exporting}
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-50"
                        aria-label="Cerrar"
                    >
                        <CloseCircleFilled />
                    </button>
                </div>

                <div className="space-y-4 px-5 py-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Filtros actuales
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                            <div className="flex justify-between gap-3">
                                <span className="text-slate-500">Empresa</span>
                                <span className="font-semibold text-slate-800">{empresaNombre}</span>
                            </div>

                            <div className="flex justify-between gap-3">
                                <span className="text-slate-500">Técnico</span>
                                <span className="font-semibold text-slate-800">{tecnicoNombre}</span>
                            </div>

                            <div className="flex justify-between gap-3">
                                <span className="text-slate-500">Periodo</span>
                                <span className="font-semibold text-slate-800">{periodoLabel}</span>
                            </div>

                            <div className="flex justify-between gap-3">
                                <span className="text-slate-500">Búsqueda</span>
                                <span className="font-semibold text-slate-800">
                                    {q?.trim() || "Sin búsqueda"}
                                </span>
                            </div>

                            <div className="flex justify-between gap-3">
                                <span className="text-slate-500">Total a exportar</span>
                                <span className="font-bold text-cyan-700">{total}</span>
                            </div>
                        </div>
                    </div>

                    {exportError && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                            {exportError}
                        </div>
                    )}

                    <div className="text-xs text-slate-500">
                        El Excel se generará usando todas las páginas del listado, no solo la página actual.
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-cyan-100 bg-slate-50 px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={exporting}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        onClick={downloadExcel}
                        disabled={exporting || total <= 0}
                        className={clsx(
                            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white",
                            exporting || total <= 0
                                ? "bg-slate-400 cursor-not-allowed"
                                : "bg-gradient-to-tr from-emerald-600 to-cyan-600 hover:brightness-110"
                        )}
                    >
                        {exporting ? <LoadingOutlined /> : <DownloadOutlined />}
                        {exporting ? "Exportando…" : "Generar Excel"}
                    </button>
                </div>
            </div>
        </div>
    );
}