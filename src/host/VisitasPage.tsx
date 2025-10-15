// src/host/Visitas.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Header from "../components/Header";
import XlsxPopulate from "xlsx-populate/browser/xlsx-populate";
import {
  SearchOutlined,
  ReloadOutlined,
  CloseCircleFilled,
  LeftOutlined,
  RightOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import VisitaDetailModal, { type VisitaDetail } from "../components/VisitaDetailModal";
import CreateVisitaModal, {
  type TecnicoMini,
  type EmpresaMini,
  type VisitaForEdit,
} from "../components/CreateVisitaModal";

/* ========= Tipado mínimo para xlsx-populate (sin any) ========= */
type ValueT = string | number | boolean | Date | null | undefined;
interface Styled { style(s: Record<string, ValueT>): this; }
interface CellLike extends Styled { value(): ValueT; value(v: ValueT): this; relativeCell(dr: number, dc: number): CellLike; }
interface ColumnLike { width(w: number): void; }
interface RowLike { height(h: number): void; }
interface RangeLike extends Styled { merged(): boolean; merged(m: boolean): this; }
interface WorksheetLike {
  cell(a1: string): CellLike; cell(r: number, c: number): CellLike;
  column(iOrLetter: number | string): ColumnLike; row(i: number): RowLike;
  range(r1: number, c1: number, r2: number, c2: number): RangeLike;
  name(): string; name(n: string): void; freezePanes?(r: number, c: number): void;
}
interface WorkbookLike { sheet(name: string): WorksheetLike | undefined; sheet(index: number): WorksheetLike | undefined; addSheet(name: string): WorksheetLike; outputAsync(): Promise<ArrayBuffer>; }

/* ========= Domain ========= */
type ApiList<T> = { page: number; pageSize: number; total: number; totalPages: number; items: T[]; };
type VisitaRow = VisitaDetail & {
  empresa?: { id_empresa: number; nombre: string } | null;
  tecnico?: { id_tecnico: number; nombre: string } | null;
  solicitanteRef?: { id_solicitante: number; nombre: string } | null;
};

/* ========= Config ========= */
type ViteEnv = { env?: { VITE_API_URL?: string; BASE_URL?: string } };
const API_URL = ((import.meta as unknown) as ViteEnv).env?.VITE_API_URL || "http://localhost:4000/api";
const BASE_URL = ((import.meta as unknown) as ViteEnv).env?.BASE_URL || "/";
const PAGE_SIZE = 10;

/* ========= Utils ========= */
function clsx(...xs: Array<string | false | null | undefined>) { return xs.filter(Boolean).join(" "); }
function useDebouncedValue<T>(value: T, delay = 400): T { const [debounced, setDebounced] = useState(value); useEffect(() => { const t = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(t); }, [value, delay]); return debounced; }
function formatDateTime(d: string | Date | null | undefined) { if (!d) return "—"; try { return new Date(d).toLocaleString("es-CL",{timeZone:"America/Santiago"});} catch { return String(d);} }
function StatusBadge({ status }: { status: string }) {
  const norm = (status || "").toUpperCase();
  const styles: Record<string, string> = {
    PENDIENTE: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    EN_PROGRESO: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    COMPLETADA: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    CANCELADA: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  };
  const klass = styles[norm] || "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  return (
    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide backdrop-blur transition", klass)}>
      {status}
    </span>
  );
}
const toSiNo = (v?: boolean) => (v ? "Sí" : "No");

/* ====== agregación para “Resumen” ====== */
function ymd(dateIso: string): string { const d=new Date(dateIso); return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`; }
function incCounter(map: Map<string, number>, key: string) { map.set(key,(map.get(key)??0)+1); }
function asTrue(v: unknown): boolean { if (typeof v==="boolean") return v; if (typeof v==="number") return v===1; if (typeof v==="string") { const s=v.trim().toLowerCase(); return s==="sí"||s==="si"||s==="true"||s==="1"; } return false; }
type Row2D = Array<string | number>;
function aggregateForResumen(items: Array<VisitaRow>) {
  const byDay = new Map<string, number>(); for (const v of items) incCounter(byDay, ymd(v.inicio));
  const daily: Row2D[] = Array.from(byDay.entries()).sort(([a],[b])=>a.localeCompare(b)).map(([d,c])=>[d,c]);
  const checklist: Row2D[] = [
    ["Rendimiento del equipo", items.filter(x=>asTrue(x.rendimientoEquipo)).length],
    ["CCleaner", items.filter(x=>asTrue(x.ccleaner)).length],
    ["Actualizaciones", items.filter(x=>asTrue(x.actualizaciones)).length],
    ["Licencia office", items.filter(x=>asTrue(x.licenciaOffice)).length],
    ["Antivirus", items.filter(x=>asTrue(x.antivirus)).length],
    ["Licencia Windows", items.filter(x=>asTrue(x.licenciaWindows)).length],
    ["Estado del disco", items.filter(x=>asTrue(x.estadoDisco)).length],
    ["Mantenimiento del reloj", items.filter(x=>asTrue(x.mantenimientoReloj)).length],
  ];
  const adicionales = items.filter(x=>asTrue(x.otros)).length;
  const pie: Row2D[] = [["Solicitudes adicionales", adicionales],["Solicitud Programada", items.length - adicionales]];
  const bySolicitanteAll = new Map<string, number>();
  for (const v of items) incCounter(bySolicitanteAll, v.solicitanteRef?.nombre ?? v.solicitante ?? "No especificado");
  const bySolicitanteAllRows: Row2D[] = Array.from(bySolicitanteAll.entries()).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([u,n])=>[u,n]);
  return { daily, checklist, pie, bySolicitanteAllRows };
}
const asPairs = (rows: Row2D[]) => rows.map(r=>[String(r[0]), Number(r[1]||0)] as [string,number]);

/* ========= Excel helpers ========= */
const HEADER = ["ID","Técnico","Empresa","Solicitante","Inicio","Estado","Impresoras","Teléfonos","Pie de página","Otros","Detalle otros","Actualizaciones","Antivirus","CCleaner","Estado disco","Lic. Office","Lic. Windows","Mant. reloj","Rend. equipo"] as const;

const PALETTE = ["D9F99D","E0F2FE","FDE68A","FBCFE8","FCA5A5","DDD6FE","A7F3D0","FDE2E2","FFE4E6","F5F5F4"];
function colorFor(key: string): string { let h=0; for (let i=0;i<key.length;i++) h=(h*31+key.charCodeAt(i))>>>0; return PALETTE[h%PALETTE.length]; }
const COLOR_BORDER = "111827";
const COLOR_TEXT = "111827";
const COLOR_HEADER_TEXT = "0B4266";

function setAllBorders(ws: WorksheetLike, r1: number, c1: number, r2: number, c2: number) {
  ws.range(r1,c1,r2,c2).style({ border: true, borderColor: COLOR_BORDER });
}
function fillBlock(ws: WorksheetLike, startCellA1: string, rows: Array<[string, number]>, maxRows = 2000) {
  const start = ws.cell(startCellA1);
  const n = Math.min(rows.length, maxRows);
  for (let i=0;i<maxRows;i++) if (i>=n) { start.relativeCell(i,0).value(null); start.relativeCell(i,1).value(null); }
  for (let i=0;i<n;i++) { start.relativeCell(i,0).value(rows[i][0]); start.relativeCell(i,1).value(rows[i][1]); }
}
function excelColWidthSetup(ws: WorksheetLike) {
  const widths = [8,22,26,30,22,14,12,12,14,10,36,14,12,10,14,14,14,14,14];
  widths.forEach((w,i)=>ws.column(i+1).width(w));
}
function safeSheetName(raw: string) { const base=(raw||"Empresa").replace(/[\\/:*?"[\]]/g,"_").slice(0,31); return base.length?base:"Empresa"; }
function ensureUniqueSheetName(wb: WorkbookLike, desired: string) { let name=desired, i=2; while (wb.sheet(name)) { const s=`_${i}`; name=(desired.slice(0,31-s.length)+s).replace(/[\\/:*?"[\]]/g,"_"); i++; } return name; }

function addDetallePorEmpresaSheets(wb: WorkbookLike, items: VisitaRow[]) {
  const byEmpresa = new Map<string, VisitaRow[]>();
  for (const v of items) {
    const emp = v.empresa?.nombre ?? `#${v.empresaId}`; const key = emp || "Sin empresa";
    (byEmpresa.get(key) ?? byEmpresa.set(key, []).get(key)!)!.push(v);
  }
  for (const [empresa, rows] of byEmpresa.entries()) {
    const ws = wb.addSheet(ensureUniqueSheetName(wb, safeSheetName(empresa)));
    ws.cell("A1").value(`Visitas — ${empresa}`).style({
      bold:true, fontFamily:"Calibri", fontSize:16, fontColor:COLOR_HEADER_TEXT,
      horizontalAlignment:"center", verticalAlignment:"center", fill:colorFor(empresa),
    });
    ws.range(1,1,1,HEADER.length).merged(true);
    ws.row(1).height(28);
    for (let c=0;c<HEADER.length;c++){
      ws.cell(3,c+1).value(HEADER[c]).style({
        bold:true, fontFamily:"Calibri", fontSize:11, fontColor:COLOR_HEADER_TEXT,
        fill:"F1F5F9", horizontalAlignment:"left", verticalAlignment:"center",
      });
    }
    ws.row(3).height(22);
    let r=4; const startRow=r, endCol=HEADER.length;
    for (const v of rows) {
      const tecnico = v.tecnico?.nombre ?? `#${v.tecnicoId}`;
      const solicitante = v.solicitanteRef?.nombre ?? v.solicitante ?? "—";
      const started = v.inicio ? new Date(v.inicio) : null;
      const rowValues: ValueT[] = [
        v.id_visita, tecnico, empresa, solicitante, started, v.status,
        toSiNo(v.confImpresoras), toSiNo(v.confTelefonos), toSiNo(v.confPiePagina),
        toSiNo(v.otros), v.otros ? (v.otrosDetalle ?? "—") : "—",
        toSiNo(!!v.actualizaciones), toSiNo(!!v.antivirus), toSiNo(!!v.ccleaner),
        toSiNo(!!v.estadoDisco), toSiNo(!!v.licenciaOffice), toSiNo(!!v.licenciaWindows),
        toSiNo(!!v.mantenimientoReloj), toSiNo(!!v.rendimientoEquipo),
      ];
      for (let c=0;c<rowValues.length;c++){
        ws.cell(r,c+1).value(rowValues[c]).style({ fontFamily:"Calibri", fontSize:11, fontColor:COLOR_TEXT, verticalAlignment:"center" });
      }
      if ((r-4)%2===1) ws.range(r,1,r,endCol).style({ fill:"F9FAFB" });
      r++;
    }
    const endRow = Math.max(startRow, r-1);
    excelColWidthSetup(ws);
    if (rows.length>0){
      ws.range(startRow,5,endRow,5).style({ numberFormat:"dd-mm-yyyy hh:mm" });
      setAllBorders(ws, 3, 1, endRow, endCol);
      ws.range(1,1,1,endCol).style({ border:true, borderColor:COLOR_BORDER });
    }
  }
}

/* ========= Resumen ========= */
function setupResumenSheet(ws: WorksheetLike) {
  const hdr = { bold:true, fill:"F1F5F9", fontColor:COLOR_HEADER_TEXT, border:true, borderColor:COLOR_BORDER, horizontalAlignment:"center", verticalAlignment:"center" } as Record<string, ValueT>;
  ws.cell("A1").value("Fecha").style(hdr); ws.cell("B1").value("Cantidad").style(hdr);
  ws.cell("F1").value("Ítem").style(hdr);  ws.cell("G1").value("Cantidad").style(hdr);
  ws.cell("K1").value("Tipo").style(hdr);  ws.cell("L1").value("Cantidad").style(hdr);
  ws.cell("P1").value("Solicitante").style(hdr); ws.cell("Q1").value("Cantidad").style(hdr);
  ws.column("A").width(14); ws.column("B").width(10);
  ws.column("F").width(24); ws.column("G").width(10);
  ws.column("K").width(20); ws.column("L").width(10);
  ws.column("P").width(26); ws.column("Q").width(10);
  ws.range(2,1,2000,1).style({ numberFormat:"dd-mm-yyyy" });
  ws.range(2,2,2000,2).style({ numberFormat:"#,##0" });
  ws.range(2,7,2000,7).style({ numberFormat:"#,##0" });
  ws.range(2,12,2000,12).style({ numberFormat:"#,##0" });
  ws.range(2,17,2000,17).style({ numberFormat:"#,##0" });
  ws.freezePanes?.(2,1);
}
function styleResumenBlocks(ws: WorksheetLike, s:{daily:number; checklist:number; pie:number; users:number;}) {
  if (s.daily>0) setAllBorders(ws,1,1,1+s.daily,2);
  if (s.checklist>0) setAllBorders(ws,1,6,1+s.checklist,7);
  if (s.pie>0) setAllBorders(ws,1,11,1+s.pie,12);
  if (s.users>0) setAllBorders(ws,1,16,1+s.users,17);
}
function mirrorResumenToHoja1(
  wb: WorkbookLike,
  wsResumen: WorksheetLike,
  counts: { daily: number; checklist: number; pie: number; users: number }
) {
  let ws1 = wb.sheet("Hoja1");
  if (!ws1) ws1 = wb.addSheet("Hoja1");
  const ensureHeader = (c1: string, c2: string, t1: string, t2: string) => {
    if (!ws1!.cell(c1).value()) ws1!.cell(c1).value(t1);
    if (!ws1!.cell(c2).value()) ws1!.cell(c2).value(t2);
  };
  ensureHeader("A1","B1","Fecha","Cantidad");
  ensureHeader("F1","G1","Ítem","Cantidad");
  ensureHeader("K1","L1","Tipo","Cantidad");
  ensureHeader("P1","Q1","Solicitante","Cantidad");
  const clearAndCopyBlock = (srcA1: string, dstA1: string, rows: number, maxRows = 10000) => {
    const s = wsResumen.cell(srcA1);
    const d = ws1!.cell(dstA1);
    for (let i = 0; i < maxRows; i++) { d.relativeCell(i, 0).value(null); d.relativeCell(i, 1).value(null); }
    for (let i = 0; i < rows; i++) {
      d.relativeCell(i, 0).value(s.relativeCell(i, 0).value());
      d.relativeCell(i, 1).value(s.relativeCell(i, 1).value());
    }
  };
  clearAndCopyBlock("A2","A2", counts.daily);
  clearAndCopyBlock("F2","F2", counts.checklist);
  clearAndCopyBlock("K2","K2", counts.pie);
  clearAndCopyBlock("P2","P2", counts.users);
  ws1.column("A").width(14); ws1.column("B").width(10);
  ws1.column("F").width(24); ws1.column("G").width(10);
  ws1.column("K").width(20); ws1.column("L").width(10);
  ws1.column("P").width(26); ws1.column("Q").width(10);
  ws1.range(2,1,10000,1).style({ numberFormat:"dd-mm-yyyy" });
  ws1.range(2,2,10000,2).style({ numberFormat:"#,##0" });
  ws1.range(2,7,10000,7).style({ numberFormat:"#,##0" });
  ws1.range(2,12,10000,12).style({ numberFormat:"#,##0" });
  ws1.range(2,17,10000,17).style({ numberFormat:"#,##0" });
  const s = counts;
  if (s.daily>0) setAllBorders(ws1,1,1,1+s.daily,2);
  if (s.checklist>0) setAllBorders(ws1,1,6,1+s.checklist,7);
  if (s.pie>0) setAllBorders(ws1,1,11,1+s.pie,12);
  if (s.users>0) setAllBorders(ws1,1,16,1+s.users,17);
}

/* ========= Carga de plantilla robusta ========= */
async function loadTemplateArrayBuffer(): Promise<ArrayBuffer> {
  const tryFetch = async (url:string): Promise<ArrayBuffer|null> => {
    try {
      const resp=await fetch(url,{cache:"no-store"});
      if(!resp.ok) return null;
      const buf=await resp.arrayBuffer();
      const sig=new Uint8Array(buf.slice(0,2));
      if(!(sig[0]===0x50&&sig[1]===0x4B)) return null;
      return buf;
    } catch { return null; }
  };
  const base=(BASE_URL||"/").replace(/\/+$/,"");
  const a=await tryFetch(`${base}/visitas_template.xlsx`); if(a) return a;
  const b=await tryFetch(`/visitas_template.xlsx`); if(b) return b;
  const c=await tryFetch(`/assets/visitas_template.xlsx`); if(c) return c;
  const wb=(await (XlsxPopulate as unknown as {fromBlankAsync():Promise<WorkbookLike>}).fromBlankAsync()) as WorkbookLike;
  wb.addSheet("Resumen"); return wb.outputAsync();
}

/* ========= Página ========= */
const VisitasPage: React.FC = () => {
  const [q,setQ]=useState(""); const qDebounced=useDebouncedValue(q,400);
  const [tecnicoId,setTecnicoId]=useState<number| "">(""); const [empresaId,setEmpresaId]=useState<number| "">("");

  const [page,setPage]=useState(1);
  const [data,setData]=useState<ApiList<VisitaRow>|null>(null);
  const totalPages=useMemo(()=>Math.max(1,data?.totalPages??1),[data]);
  const canPrev=page>1; const canNext=page<totalPages;

  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [tecnicos,setTecnicos]=useState<TecnicoMini[]>([]);
  const [empresas,setEmpresas]=useState<EmpresaMini[]>([]);
  const [openDetail,setOpenDetail]=useState(false);
  const [selected,setSelected]=useState<VisitaDetail|null>(null);

  // crear
  const [openCreate,setOpenCreate]=useState(false);

  // editar con CreateVisitaModal
  const [openEdit, setOpenEdit] = useState(false);
  const [editVisita, setEditVisita] = useState<VisitaForEdit | null>(null);

  const [deletingId,setDeletingId]=useState<number|null>(null);

  const reqSeqRef=useRef(0);

  const showingRange=useMemo(()=>{ if(!data||data.total===0) return null; const start=(data.page-1)*data.pageSize+1; const end=Math.min(data.page*data.pageSize,data.total); return {start,end}; },[data]);

  /* === useCallback para cumplir exhaustive-deps === */
  const fetchFilters = useCallback(async (signal?: AbortSignal) => {
    try {
      const url=new URL(`${API_URL}/visitas/filters`);
      const token=localStorage.getItem("accessToken");
      const r=await fetch(url.toString(),{
        headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},
        credentials:"include",
        cache:"no-store",
        signal
      });
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const json=await r.json() as {tecnicos:TecnicoMini[]; empresas:EmpresaMini[]};
      setTecnicos(json.tecnicos||[]);
      setEmpresas(json.empresas||[]);
    } catch { /* noop */ }
  }, []);

  const fetchList = useCallback(async (signal?: AbortSignal) => {
    const seq=++reqSeqRef.current;
    try {
      setLoading(true); setError(null);
      const url=new URL(`${API_URL}/visitas`);
      url.searchParams.set("page",String(page)); url.searchParams.set("pageSize",String(PAGE_SIZE));
      if(qDebounced.trim()) url.searchParams.set("q",qDebounced.trim());
      if(tecnicoId) url.searchParams.set("tecnicoId",String(tecnicoId));
      if(empresaId) url.searchParams.set("empresaId",String(empresaId));
      url.searchParams.set("_ts",String(Date.now()));
      const token=localStorage.getItem("accessToken");
      const res=await fetch(url.toString(),{
        method:"GET",
        headers:{
          "Content-Type":"application/json",
          "Cache-Control":"no-cache",
          Pragma:"no-cache",
          ...(token?{Authorization:`Bearer ${token}`}:{})
        },
        cache:"no-store",
        credentials:"include",
        signal
      });
      if(seq!==reqSeqRef.current) return;
      if(!res.ok&&res.status!==204){
        let apiErr=`HTTP ${res.status}`;
        try{ const payload=await res.json() as { error?: string }; apiErr=payload?.error||apiErr; }catch{
          //
        }
        throw new Error(apiErr);
      }
      if(res.status===204){ setData({page,pageSize:PAGE_SIZE,total:0,totalPages:1,items:[]}); return; }
      const ct=res.headers.get("content-type")||"";
      if(ct.includes("application/json")) setData(await res.json() as ApiList<VisitaRow>);
      else {
        const text=await res.text();
        const json=text?(JSON.parse(text) as ApiList<VisitaRow>):null;
        setData(json??{page,pageSize:PAGE_SIZE,total:0,totalPages:1,items:[]});
      }
    } catch(err){
      if((err as Error).name!=="AbortError") setError((err as Error)?.message||"Error al cargar visitas");
    } finally {
      if(seq===reqSeqRef.current) setLoading(false);
    }
  }, [page, qDebounced, tecnicoId, empresaId]);

  const refreshNow = useCallback(() => {
    const c=new AbortController();
    void fetchList(c.signal);
  }, [fetchList]);

  /* === Efectos usando las funciones memorizadas === */
  useEffect(()=>{ const c=new AbortController(); fetchFilters(c.signal); return ()=>c.abort(); },[fetchFilters]);
  useEffect(()=>{ const c=new AbortController(); fetchList(c.signal); return ()=>c.abort(); },[fetchList]);

  const goPrev=()=>canPrev&&setPage(p=>p-1);
  const goNext=()=>canNext&&setPage(p=>p+1);
  const clearAll=()=>{ setQ(""); setTecnicoId(""); setEmpresaId(""); setPage(1); };

  const openRow=(row:VisitaRow)=>{ const visita:VisitaDetail={
      id_visita:row.id_visita, empresaId:row.empresaId, tecnicoId:row.tecnicoId,
      solicitante: row.solicitante ?? row.solicitanteRef?.nombre ?? "",
      inicio:row.inicio, fin:row.fin??null,
      confImpresoras:row.confImpresoras, confTelefonos:row.confTelefonos, confPiePagina:row.confPiePagina,
      otros:row.otros, otrosDetalle:row.otrosDetalle??null, status:row.status,
      empresa:row.empresa?{id_empresa:row.empresa.id_empresa, nombre:row.empresa.nombre}:undefined,
      tecnico:row.tecnico?{id_tecnico:row.tecnico.id_tecnico, nombre:row.tecnico.nombre}:undefined,
      actualizaciones:row.actualizaciones, antivirus:row.antivirus, ccleaner:row.ccleaner,
      estadoDisco:row.estadoDisco, licenciaOffice:row.licenciaOffice, licenciaWindows:row.licenciaWindows,
      mantenimientoReloj:row.mantenimientoReloj, rendimientoEquipo:row.rendimientoEquipo
    }; setSelected(visita); setOpenDetail(true); };

  async function apiDeleteVisita(id: number) {
    const token=localStorage.getItem("accessToken");
    const r=await fetch(`${API_URL}/visitas/${id}`,{
      method:"DELETE",
      headers:{...(token?{Authorization:`Bearer ${token}`}:{})},
      credentials:"include",
      cache:"no-store",
    });
    if(!(r.ok || r.status===204)) {
      let msg=`HTTP ${r.status}`;
      try { const j=await r.json() as { error?: string }; msg=j?.error||msg; } catch { /* noop */ }
      throw new Error(msg);
    }
  }

  const onClickEdit = (row: VisitaRow) => {
    const v: VisitaForEdit = {
      id_visita: row.id_visita,
      empresaId: row.empresaId,
      tecnicoId: row.tecnicoId,
      solicitante: row.solicitante ?? row.solicitanteRef?.nombre ?? "",
      solicitanteId: row.solicitanteRef?.id_solicitante ?? null,
      inicio: row.inicio,
      fin: row.fin ?? null,
      status: row.status as unknown as VisitaForEdit["status"],
      confImpresoras: !!row.confImpresoras,
      confTelefonos: !!row.confTelefonos,
      confPiePagina: !!row.confPiePagina,
      otros: !!row.otros,
      otrosDetalle: row.otros ? (row.otrosDetalle ?? null) : null,
      actualizaciones: !!row.actualizaciones,
      antivirus: !!row.antivirus,
      ccleaner: !!row.ccleaner,
      estadoDisco: !!row.estadoDisco,
      licenciaOffice: !!row.licenciaOffice,
      licenciaWindows: !!row.licenciaWindows,
      mantenimientoReloj: !!row.mantenimientoReloj,
      rendimientoEquipo: !!row.rendimientoEquipo,
    };
    setEditVisita(v);
    setOpenEdit(true);
  };

  const onClickDelete = async (row: VisitaRow) => {
    if (!window.confirm(`¿Eliminar la visita #${row.id_visita}? Esta acción no se puede deshacer.`)) return;
    try {
      setDeletingId(row.id_visita);
      await apiDeleteVisita(row.id_visita);
      refreshNow();
    } catch (e) {
      alert((e as Error).message || "No se pudo eliminar la visita");
    } finally {
      setDeletingId(null);
    }
  };

  const onExportEmpresas=async()=>{ try{
      const total=data?.total??0; if(total<=0) return;
      const listUrl=new URL(`${API_URL}/visitas`); listUrl.searchParams.set("page","1"); listUrl.searchParams.set("pageSize",String(Math.max(1,total)));
      if(qDebounced.trim()) listUrl.searchParams.set("q",qDebounced.trim());
      if(tecnicoId) listUrl.searchParams.set("tecnicoId",String(tecnicoId));
      if(empresaId) listUrl.searchParams.set("empresaId",String(empresaId));
      listUrl.searchParams.set("_ts",String(Date.now()));
      const token=localStorage.getItem("accessToken");
      const r=await fetch(listUrl.toString(),{headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},credentials:"include",cache:"no-store"});
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const full=await r.json() as ApiList<VisitaRow>; const items=full.items??[];
      const tplArrayBuf=await loadTemplateArrayBuffer();
      const wb=await (XlsxPopulate as unknown as {fromDataAsync(buf:ArrayBuffer):Promise<WorkbookLike>}).fromDataAsync(tplArrayBuf) as WorkbookLike;
      let ws=wb.sheet("Resumen"); if(!ws) ws=wb.addSheet("Resumen");
      setupResumenSheet(ws);
      const {daily,checklist,pie,bySolicitanteAllRows}=aggregateForResumen(items);
      fillBlock(ws,"A2",asPairs(daily),2000);
      fillBlock(ws,"F2",asPairs(checklist),2000);
      fillBlock(ws,"K2",asPairs(pie),2000);
      fillBlock(ws,"P2",asPairs(bySolicitanteAllRows),2000);
      styleResumenBlocks(ws,{daily:daily.length,checklist:checklist.length,pie:pie.length,users:bySolicitanteAllRows.length});
      mirrorResumenToHoja1(wb, ws, { daily: daily.length, checklist: checklist.length, pie: pie.length, users: bySolicitanteAllRows.length });
      addDetallePorEmpresaSheets(wb,items);
      const out=await wb.outputAsync();
      const blob=new Blob([out as ArrayBuffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
      const urlBlob=URL.createObjectURL(blob);
      const a=document.createElement("a"); a.href=urlBlob; a.download=`Visitas_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(urlBlob);
    } catch(e){ console.error("[Export Excel] Error:",e); alert("No se pudo exportar el Excel. Revisa consola (plantilla/rutas/permiso)."); } };

  return (
    <div className="min-h-screen relative">
      {/* Fondo claro tecnológico */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white" />
        <div className="absolute -top-28 -left-28 w-[60vw] max-w-[520px] aspect-square rounded-full blur-3xl opacity-60 bg-gradient-to-br from-cyan-100 to-indigo-100" />
        <div className="absolute -bottom-40 -right-40 w-[65vw] max-w-[560px] aspect-square rounded-full blur-3xl opacity-50 bg-gradient-to-tr from-fuchsia-100 to-cyan-100" />
      </div>

      <Header />

      {/* Hero / Toolbar */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 max-w-6xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 shadow-sm transition">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgba(14,165,233,0.10),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.10),transparent_55%)]" />
          <div className="relative p-4 sm:p-6 md:p-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
              Visitas <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">RIDS.CL</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Filtra por técnico, empresa o texto libre. Exporta y gestiona en tiempo real.
            </p>

            {/* Toolbar responsive */}
            <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
              {/* búsqueda */}
              <div className="relative lg:col-span-2">
                <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e)=>{setQ(e.target.value); setPage(1);}}
                  placeholder="Buscar…"
                  className="w-full rounded-xl sm:rounded-2xl border border-slate-200 bg-white pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  aria-label="Buscar visitas"
                />
                {q.length>0&&(
                  <button
                    onClick={()=>setQ("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    aria-label="Limpiar búsqueda"
                  >
                    <CloseCircleFilled />
                  </button>
                )}
              </div>

              <select
                value={tecnicoId}
                onChange={(e)=>{const v=e.target.value; setTecnicoId(v?Number(v):""); setPage(1);}}
                className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                aria-label="Filtrar por técnico"
              >
                <option value="">Todos los técnicos</option>
                {tecnicos.map(t=> (<option key={t.id} value={t.id}>{t.nombre}</option>))}
              </select>

              <select
                value={empresaId}
                onChange={(e)=>{const v=e.target.value; setEmpresaId(v?Number(v):""); setPage(1);}}
                className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                aria-label="Filtrar por empresa"
              >
                <option value="">Todas las empresas</option>
                {empresas.map(e=> (<option key={e.id} value={e.id}>{e.nombre}</option>))}
              </select>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={clearAll}
                  className="col-span-1 inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl border border-slate-200 text-slate-700 px-3 py-2.5 text-sm hover:bg-slate-50 transition"
                  title="Limpiar filtros"
                >
                  <CloseCircleFilled className="hidden sm:inline" /> <span className="truncate">Limpiar</span>
                </button>
                <button
                  onClick={onExportEmpresas}
                  disabled={!data||(data?.total??0)===0}
                  className={clsx(
                    "col-span-1 inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl px-3 py-2.5 text-sm text-white",
                    "bg-gradient-to-br from-cyan-600 to-indigo-600 shadow-[0_8px_24px_-6px_rgba(56,189,248,0.35)] hover:brightness-110 transition",
                    (!data||(data?.total??0)===0) && "opacity-50 cursor-not-allowed"
                  )}
                  title="Exportar"
                >
                  <DownloadOutlined className="hidden sm:inline" /> <span className="truncate">Exportar</span>
                </button>
                <button
                  onClick={()=>setOpenCreate(true)}
                  className="col-span-1 inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl px-3 py-2.5 text-sm
                             bg-gradient-to-br from-emerald-500 to-cyan-600 text-white shadow-[0_8px_24px_-6px_rgba(16,185,129,0.35)] hover:brightness-110 transition"
                  title="Nueva visita"
                >
                  <span className="sm:hidden">+</span><span className="hidden sm:inline">+ Nueva</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista responsiva: Cards en móvil / Tabla en md+ */}
      <main className="px-4 sm:px-6 pb-6 max-w-6xl mx-auto">
        {/* Cards (mobile) */}
        <section className="md:hidden space-y-3 mt-4" aria-live="polite" aria-busy={loading?"true":"false"}>
          {loading && (
            <div className="space-y-3">
              {Array.from({length:6}).map((_,i)=>(
                <div key={`skc-${i}`} className="rounded-2xl border border-slate-200 bg-white p-4 animate-pulse">
                  <div className="h-4 w-24 bg-slate-100 rounded mb-2" />
                  <div className="h-3 w-3/4 bg-slate-100 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          )}
          {!loading && error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 p-4 text-center">{error}</div>
          )}
          {!loading && !error && data?.items?.length===0 && (
            <div className="rounded-2xl border border-slate-200 bg-white text-slate-600 p-4 text-center">Sin resultados.</div>
          )}
          {!loading && !error && data?.items?.map((v)=> {
            const nombreSolicitante = v.solicitanteRef?.nombre ?? v.solicitante ?? "—";
            const isDeleting = deletingId === v.id_visita;
            return (
              <article
                key={v.id_visita}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md hover:scale-[1.01]"
              >
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500">#{v.id_visita}</div>
                    <h3 className="text-base font-semibold text-slate-900">{v.empresa?.nombre ?? `#${v.empresaId}`}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">{v.tecnico?.nombre ?? `#${v.tecnicoId}`} • {formatDateTime(v.inicio)}</p>
                  </div>
                  <StatusBadge status={v.status} />
                </header>
                <p className="text-sm text-slate-700 mt-2">
                  <span className="text-slate-500">Solicitante:</span> {nombreSolicitante}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button onClick={()=>openRow(v)} className="col-span-1 rounded-xl border border-slate-200 text-slate-700 px-2 py-2 text-sm hover:bg-slate-50">Detalle</button>
                  <button onClick={()=>onClickEdit(v)} className="col-span-1 inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-200 text-emerald-700 px-2 py-2 text-sm hover:bg-emerald-50"><EditOutlined />Editar</button>
                  <button
                    onClick={()=>onClickDelete(v)}
                    disabled={isDeleting}
                    className={clsx("col-span-1 inline-flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-sm transition",
                      isDeleting ? "border-rose-200 bg-rose-50 text-rose-700 cursor-wait" : "border-rose-200 text-rose-700 hover:bg-rose-50")}
                  >
                    <DeleteOutlined /> {isDeleting ? "…" : "Eliminar"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        {/* Tabla (desktop) */}
        <section
          className="hidden md:block rounded-3xl border border-slate-200 bg-white overflow-hidden mt-4"
          aria-live="polite" aria-busy={loading?"true":"false"}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-white to-slate-50 text-slate-700 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  {["ID","Técnico","Empresa","Solicitante","Inicio","Estado","Acciones"].map((h)=>(
                    <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-800">
                {loading && <TableSkeletonRows cols={7} rows={8} />}
                {!loading && error && (<tr><td colSpan={7} className="px-4 py-10 text-center text-rose-700">{error}</td></tr>)}
                {!loading && !error && data?.items?.length===0 && (<tr><td colSpan={7} className="px-4 py-10 text-center text-slate-600">Sin resultados.</td></tr>)}
                {!loading && !error && data?.items?.map((v)=> {
                  const nombreSolicitante = v.solicitanteRef?.nombre ?? v.solicitante ?? "—";
                  const isDeleting = deletingId === v.id_visita;
                  return (
                    <tr
                      key={v.id_visita}
                      className={clsx(
                        "border-t border-slate-200 transition-colors",
                        "odd:bg-white even:bg-slate-50/50 hover:bg-cyan-50"
                      )}
                      title="Ver detalle"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">{v.id_visita}</td>
                      <td className="px-4 py-3">{v.tecnico?.nombre ?? `#${v.tecnicoId}`}</td>
                      <td className="px-4 py-3">{v.empresa?.nombre ?? `#${v.empresaId}`}</td>
                      <td className="px-4 py-3"><div className="max-w-[420px] truncate" title={nombreSolicitante}>{nombreSolicitante}</div></td>
                      <td className="px-4 py-3">{formatDateTime(v.inicio)}</td>
                      <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={()=>openRow(v)} className="rounded-lg border border-slate-200 text-slate-700 px-2 py-1 hover:bg-slate-50 transition">Detalle</button>
                          <button onClick={()=>onClickEdit(v)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 text-emerald-700 px-2 py-1 hover:bg-emerald-50 transition"><EditOutlined /> Editar</button>
                          <button
                            onClick={()=>onClickDelete(v)}
                            disabled={isDeleting}
                            className={clsx("inline-flex items-center gap-1 rounded-lg border px-2 py-1 transition",
                              isDeleting ? "border-rose-200 bg-rose-50 text-rose-700 cursor-wait" : "border-rose-200 text-rose-700 hover:bg-rose-50")}
                          >
                            <DeleteOutlined /> {isDeleting ? "Eliminando…" : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );})}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-slate-50 border-t border-slate-200">
            <div className="text-sm text-slate-600 text-center sm:text-left">
              {data ? (showingRange ? <>Mostrando <strong className="text-slate-900">{showingRange.start}</strong>–<strong className="text-slate-900">{showingRange.end}</strong> de <strong className="text-slate-900">{data.total}</strong> • Página <strong className="text-slate-900">{data.page}</strong> de <strong className="text-slate-900">{totalPages}</strong></> : "—") : "—"}
            </div>
            <div className="grid grid-cols-3 sm:flex sm:items-center gap-2">
              <button onClick={refreshNow} className="inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm border-slate-200 text-slate-700 hover:bg-slate-50 transition" title="Recargar"><ReloadOutlined /> <span className="hidden sm:inline">Recargar</span></button>
              <button onClick={goPrev} disabled={!canPrev||loading} className={clsx("inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm","border-slate-200 text-slate-700 hover:bg-slate-50 transition",(!canPrev||loading)&&"opacity-40 cursor-not-allowed hover:bg-transparent")} aria-label="Página anterior"><LeftOutlined /><span className="hidden sm:inline">Anterior</span></button>
              <button onClick={goNext} disabled={!canNext||loading} className={clsx("inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm","border-slate-200 text-slate-700 hover:bg-slate-50 transition",(!canNext||loading)&&"opacity-40 cursor-not-allowed hover:bg-transparent")} aria-label="Página siguiente"><span className="hidden sm:inline">Siguiente</span><RightOutlined /></button>
            </div>
          </div>
        </section>
      </main>

      {/* Modales */}
      <VisitaDetailModal open={openDetail} onClose={()=>setOpenDetail(false)} visita={selected} />

      {/* Crear */}
      <CreateVisitaModal
        open={openCreate}
        onClose={()=>setOpenCreate(false)}
        onCreated={()=>{ setOpenCreate(false); refreshNow(); }}
        tecnicos={tecnicos}
        empresas={empresas}
      />

      {/* Editar (reutiliza CreateVisitaModal en modo edición) */}
      <CreateVisitaModal
        open={openEdit}
        mode="edit"
        visita={editVisita ?? undefined}
        onClose={()=>{ setOpenEdit(false); setEditVisita(null); }}
        onCreated={()=>{}}
        onUpdated={()=>{ setOpenEdit(false); setEditVisita(null); refreshNow(); }}
        tecnicos={tecnicos}
        empresas={empresas}
      />
    </div>
  );
};
export default VisitasPage;

/* ========= Skeleton ========= */
function TableSkeletonRows({ cols, rows = 8 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={`sk-${i}`} className="border-t border-slate-200">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={`sk-${i}-${j}`} className="px-4 py-3">
              <div className="h-4 w-full max-w-[260px] animate-pulse rounded bg-slate-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
