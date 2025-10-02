// src/host/Visitas.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";
import {
  SearchOutlined,
  ReloadOutlined,
  CloseCircleFilled,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import VisitaDetailModal, { type VisitaDetail } from "../components/VisitaDetailModal";

/* ========= Tipos ========= */
type EmpresaMini = { id: number; nombre: string };
type TecnicoMini = { id: number; nombre: string };

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
  solicitanteRef?: { id_solicitante: number; nombre: string } | null; // 👈 relación opcional
};

/* ========= Config ========= */
const API_URL =
  (import.meta as ImportMeta).env?.VITE_API_URL || "http://localhost:4000/api";
const PAGE_SIZE = 10;

/* ========= Utils ========= */
function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("es-CL");
  } catch {
    return String(d);
  }
}
function StatusBadge({ status }: { status: string }) {
  const norm = (status || "").toUpperCase();
  const styles: Record<string, string> = {
    PENDIENTE: "bg-amber-50 text-amber-800 border border-amber-200",
    EN_PROGRESO: "bg-sky-50 text-sky-800 border border-sky-200",
    COMPLETADA: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    CANCELADA: "bg-rose-50 text-rose-800 border border-rose-200",
  };
  const klass = styles[norm] || "bg-neutral-50 text-neutral-700 border border-neutral-200";
  return (
    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", klass)}>
      {status}
    </span>
  );
}

/* ========= Skeleton ========= */
const TableSkeletonRows: React.FC<{ cols: number; rows?: number }> = ({ cols, rows = 8 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={`sk-${i}`} className="border-t border-neutral-100">
        {Array.from({ length: cols }).map((__, j) => (
          <td key={`sk-${i}-${j}`} className="px-4 py-3">
            <div className="h-4 w-full max-w-[260px] animate-pulse rounded bg-neutral-200/70" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/* ========= Page ========= */
const VisitasPage: React.FC = () => {
  // búsqueda y filtros
  const [q, setQ] = useState("");
  const qDebounced = useDebouncedValue(q, 400);
  const [tecnicoId, setTecnicoId] = useState<number | "">("");
  const [empresaId, setEmpresaId] = useState<number | "">("");

  // paginación
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiList<VisitaRow> | null>(null);
  const totalPages = useMemo(() => Math.max(1, data?.totalPages ?? 1), [data]);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  // carga/errores
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // selects
  const [tecnicos, setTecnicos] = useState<TecnicoMini[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaMini[]>([]);

  // modal
  const [openDetail, setOpenDetail] = useState(false);
  const [selected, setSelected] = useState<VisitaDetail | null>(null);

  // anti-race
  const reqSeqRef = useRef(0);

  const showingRange = useMemo(() => {
    if (!data || data.total === 0) return null;
    const start = (data.page - 1) * data.pageSize + 1;
    const end = Math.min(data.page * data.pageSize, data.total);
    return { start, end };
  }, [data]);

  /* ====== Fetch filtros ====== */
  const fetchFilters = async (signal?: AbortSignal) => {
    try {
      const url = new URL(`${API_URL}/visitas/filters`);
      const token = localStorage.getItem("accessToken");
      const r = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        cache: "no-store",
        signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = (await r.json()) as { tecnicos: TecnicoMini[]; empresas: EmpresaMini[] };
      setTecnicos(json.tecnicos || []);
      setEmpresas(json.empresas || []);
    } catch {
      // silencioso
    }
  };

  /* ====== Fetch lista paginada ====== */
  const fetchList = async (signal?: AbortSignal) => {
    const seq = ++reqSeqRef.current;
    try {
      setLoading(true);
      setError(null);

      const url = new URL(`${API_URL}/visitas`);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(PAGE_SIZE));
      if (qDebounced.trim()) url.searchParams.set("q", qDebounced.trim());
      if (tecnicoId) url.searchParams.set("tecnicoId", String(tecnicoId));
      if (empresaId) url.searchParams.set("empresaId", String(empresaId));
      url.searchParams.set("_ts", String(Date.now()));

      const token = localStorage.getItem("accessToken");
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
        credentials: "include",
        signal,
      });

      if (seq !== reqSeqRef.current) return;

      if (!res.ok && res.status !== 204) {
        let apiErr = `HTTP ${res.status}`;
        try {
          const payload = await res.json();
          apiErr = (payload as { error?: string })?.error || apiErr;
        } catch {
          //
        }
        throw new Error(apiErr);
      }

      if (res.status === 204) {
        setData({ page, pageSize: PAGE_SIZE, total: 0, totalPages: 1, items: [] });
        return;
      }

      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const json = (await res.json()) as ApiList<VisitaRow>;
        setData(json);
      } else {
        const text = await res.text();
        const json = text ? (JSON.parse(text) as ApiList<VisitaRow>) : null;
        setData(json ?? { page, pageSize: PAGE_SIZE, total: 0, totalPages: 1, items: [] });
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error)?.message || "Error al cargar visitas");
    } finally {
      if (seq === reqSeqRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    const c = new AbortController();
    fetchFilters(c.signal);
    return () => c.abort();
  }, []);

  useEffect(() => {
    const c = new AbortController();
    fetchList(c.signal);
    return () => c.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, qDebounced, tecnicoId, empresaId]);

  /* ====== Handlers ====== */
  const goPrev = () => canPrev && setPage((p) => p - 1);
  const goNext = () => canNext && setPage((p) => p + 1);

  const clearAll = () => {
    setQ("");
    setTecnicoId("");
    setEmpresaId("");
    setPage(1);
    const c = new AbortController();
    fetchList(c.signal);
  };

  const openRow = (row: VisitaRow) => {
    // 👇 ya no usamos "realizado"; pasamos solicitante (y dejamos otros campos)
    const visita: VisitaDetail = {
      id_visita: row.id_visita,
      empresaId: row.empresaId,
      tecnicoId: row.tecnicoId,
      solicitante: row.solicitante, // nombre libre
      inicio: row.inicio,
      fin: row.fin ?? null,
      confImpresoras: row.confImpresoras,
      confTelefonos: row.confTelefonos,
      confPiePagina: row.confPiePagina,
      otros: row.otros,
      otrosDetalle: row.otrosDetalle ?? null,
      status: row.status,
      // relaciones (si tu modal las muestra)
      empresa: row.empresa
        ? { id_empresa: row.empresa.id_empresa, nombre: row.empresa.nombre }
        : undefined,
      tecnico: row.tecnico
        ? { id_tecnico: row.tecnico.id_tecnico, nombre: row.tecnico.nombre }
        : undefined,
      // si tu modal soporta mostrar el solicitante referenciado, puedes añadirlo allí también
    };
    setSelected(visita);
    setOpenDetail(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/40 via-white to-white">
      <Header />

      <main className="p-6 max-w-6xl mx-auto">
        {/* Título + filtros */}
        <header className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
              Visitas
            </h1>
            <p className="text-sm text-neutral-500">
              Filtra por técnico, empresa o texto libre (solicitante).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Buscar */}
            <div className="relative w-full sm:w-64">
              <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar..."
                className={clsx(
                  "w-full rounded-2xl border border-neutral-300 bg-white pl-9 pr-10 py-2.5",
                  "focus:outline-none focus:ring-2 focus:ring-cyan-600/30 focus:border-cyan-600/50"
                )}
                aria-label="Buscar visitas"
              />
              {q.length > 0 && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  aria-label="Limpiar búsqueda"
                >
                  <CloseCircleFilled />
                </button>
              )}
            </div>

            {/* Filtro Técnico */}
            <select
              value={tecnicoId}
              onChange={(e) => {
                const v = e.target.value;
                setTecnicoId(v ? Number(v) : "");
                setPage(1);
              }}
              className="rounded-2xl border border-neutral-300 bg-white px-3 py-2.5 text-sm"
              aria-label="Filtrar por técnico"
            >
              <option value="">Todos los técnicos</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>

            {/* Filtro Empresa */}
            <select
              value={empresaId}
              onChange={(e) => {
                const v = e.target.value;
                setEmpresaId(v ? Number(v) : "");
                setPage(1);
              }}
              className="rounded-2xl border border-neutral-300 bg-white px-3 py-2.5 text-sm"
              aria-label="Filtrar por empresa"
            >
              <option value="">Todas las empresas</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>

            {/* Limpiar */}
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300 text-cyan-800 px-3 py-2.5 text-sm hover:bg-cyan-50"
              title="Limpiar filtros"
            >
              <CloseCircleFilled /> Limpiar
            </button>
          </div>
        </header>

        {/* Tabla */}
        <section
          className="rounded-3xl border border-cyan-100 shadow-sm shadow-cyan-100/40 bg-white overflow-hidden"
          aria-live="polite"
          aria-busy={loading ? "true" : "false"}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-cyan-50 text-cyan-900 border-b border-cyan-100 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 w-[90px] font-semibold">ID</th>
                  <th className="text-left px-4 py-3 min-w-[180px] font-semibold">Técnico</th>
                  <th className="text-left px-4 py-3 min-w-[220px] font-semibold">Empresa</th>
                  <th className="text-left px-4 py-3 min-w-[260px] font-semibold">Solicitante</th> {/* 👈 */}
                  <th className="text-left px-4 py-3 min-w-[200px] font-semibold">Inicio</th>
                  <th className="text-left px-4 py-3 min-w-[200px] font-semibold">Fin</th>
                  <th className="text-left px-4 py-3 min-w-[140px] font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading && <TableSkeletonRows cols={7} rows={8} />}

                {!loading && error && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                )}

                {!loading && !error && data?.items?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                      Sin resultados.
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  data?.items?.map((v) => {
                    const nombreSolicitante = v.solicitanteRef?.nombre ?? v.solicitante ?? "—";
                    return (
                      <tr
                        key={v.id_visita}
                        tabIndex={0}
                        onClick={() => openRow(v)}
                        onKeyDown={(e) => (e.key === "Enter" ? openRow(v) : null)}
                        className={clsx(
                          "border-t border-neutral-100 transition-colors cursor-pointer",
                          "odd:bg-white even:bg-neutral-50/30 hover:bg-cyan-50/70 focus-visible:outline-none focus-visible:bg-cyan-50"
                        )}
                        title="Ver detalle"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">{v.id_visita}</td>
                        <td className="px-4 py-3">
                          {v.tecnico?.nombre ?? `#${v.tecnicoId}`}
                        </td>
                        <td className="px-4 py-3">
                          {v.empresa?.nombre ?? `#${v.empresaId}`}
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-[420px] truncate" title={nombreSolicitante}>
                            {nombreSolicitante}
                          </div>
                        </td>
                        <td className="px-4 py-3">{formatDateTime(v.inicio)}</td>
                        <td className="px-4 py-3">{formatDateTime(v.fin)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={v.status} />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Footer paginación */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-cyan-100">
            <div className="text-sm text-neutral-700">
              {data ? (
                showingRange ? (
                  <>
                    Mostrando <strong>{showingRange.start}</strong>–<strong>{showingRange.end}</strong> de{" "}
                    <strong>{data.total}</strong> • Página <strong>{data.page}</strong> de{" "}
                    <strong>{totalPages}</strong>
                  </>
                ) : (
                  "—"
                )
              ) : (
                "—"
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const c = new AbortController();
                  fetchList(c.signal);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm border-cyan-300 text-cyan-800 hover:bg-cyan-50"
                title="Recargar"
              >
                <ReloadOutlined /> Recargar
              </button>

              <div className="w-px h-5 bg-cyan-100" />

              <button
                onClick={goPrev}
                disabled={!canPrev || loading}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                  "border-cyan-300 text-cyan-800 hover:bg-cyan-50",
                  (!canPrev || loading) && "opacity-50 cursor-not-allowed hover:bg-transparent"
                )}
                aria-label="Página anterior"
              >
                <LeftOutlined />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              <button
                onClick={goNext}
                disabled={!canNext || loading}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                  "border-cyan-300 text-cyan-800 hover:bg-cyan-50",
                  (!canNext || loading) && "opacity-50 cursor-not-allowed hover:bg-transparent"
                )}
                aria-label="Página siguiente"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <RightOutlined />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Modal detalle */}
      <VisitaDetailModal
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        visita={selected}
      />
    </div>
  );
};

export default VisitasPage;
