import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SearchOutlined,
  LeftOutlined,
  RightOutlined,
  CloseCircleFilled,
  ReloadOutlined,
  TeamOutlined,
  ApartmentOutlined,
  LaptopOutlined,
  LoadingOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import Header from "../components/Header";
import SolicitanteDetailModal from "../components/SolicitanteDetailModal";
import type { SolicitanteForDetail } from "../components/SolicitanteDetailModal";

/* =================== Tipos =================== */
type Empresa = { id_empresa: number; nombre: string } | null;
type Equipo = {
  id_equipo: number;
  idSolicitante: number;
  serial: string | null;
  marca: string | null;
  modelo: string | null;
  procesador: string | null;
  ram: string | null;
  disco: string | null;
  propiedad: string | null;
};

export type SolicitanteRow = {
  id_solicitante: number;
  nombre: string;
  empresaId: number | null;
  empresa: Empresa;
  equipos: Equipo[];
};

export type ApiList<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: T[];
};

/* =================== Config =================== */
const API_URL =
  (import.meta as ImportMeta).env?.VITE_API_URL || "http://localhost:4000/api";
const PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/* =================== Helpers =================== */
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

/** Hash simple y estable (para elegir color) */
function strHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Paleta de tags (border/bg/text) para empresas */
const COMPANY_TAG_PALETTE = [
  "border-emerald-200 bg-emerald-50 text-emerald-900",
  "border-teal-200 bg-teal-50 text-teal-900",
  "border-cyan-200 bg-cyan-50 text-cyan-900",
  "border-sky-200 bg-sky-50 text-sky-900",
  "border-blue-200 bg-blue-50 text-blue-900",
  "border-indigo-200 bg-indigo-50 text-indigo-900",
  "border-violet-200 bg-violet-50 text-violet-900",
  "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900",
  "border-rose-200 bg-rose-50 text-rose-900",
  "border-red-200 bg-red-50 text-red-900",
  "border-orange-200 bg-orange-50 text-orange-900",
  "border-amber-200 bg-amber-50 text-amber-900",
  "border-lime-200 bg-lime-50 text-lime-900",
  "border-green-200 bg-green-50 text-green-900",
];

/** Color para empresa por id/nombre (estable) */
function companyTagClasses(emp?: Empresa) {
  if (!emp) return "border-neutral-200 bg-neutral-50 text-neutral-700";
  const seed =
    typeof emp.id_empresa === "number"
      ? String(emp.id_empresa)
      : emp.nombre || "empresa";
  const idx = strHash(seed) % COMPANY_TAG_PALETTE.length;
  return COMPANY_TAG_PALETTE[idx];
}

/** Colores por marca conocidas + paleta fallback por hash */
function brandTagClasses(brand?: string | null) {
  const b = (brand || "").trim().toLowerCase();

  // conocidas
  if (/apple|macbook|imac|mac/.test(b))
    return "border-slate-300 bg-slate-50 text-slate-900";
  if (/dell/.test(b)) return "border-indigo-200 bg-indigo-50 text-indigo-900";
  if (/\bhp\b|hewlett|packard/.test(b))
    return "border-sky-200 bg-sky-50 text-sky-900";
  if (/lenovo/.test(b))
    return "border-orange-200 bg-orange-50 text-orange-900";
  if (/acer/.test(b)) return "border-lime-200 bg-lime-50 text-lime-900";
  if (/asus/.test(b)) return "border-violet-200 bg-violet-50 text-violet-900";
  if (/samsung/.test(b)) return "border-blue-200 bg-blue-50 text-blue-900";
  if (/\bmsi\b/.test(b)) return "border-rose-200 bg-rose-50 text-rose-900";
  if (/toshiba/.test(b)) return "border-amber-200 bg-amber-50 text-amber-900";
  if (/huawei/.test(b)) return "border-red-200 bg-red-50 text-red-900";
  if (/^lg$|lg electronics/.test(b))
    return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900";
  if (/microsoft|surface/.test(b))
    return "border-purple-200 bg-purple-50 text-purple-900";

  // fallback hash para variedad estable
  const BRAND_PALETTE = [
    "border-teal-200 bg-teal-50 text-teal-900",
    "border-cyan-200 bg-cyan-50 text-cyan-900",
    "border-emerald-200 bg-emerald-50 text-emerald-900",
    "border-blue-200 bg-blue-50 text-blue-900",
    "border-indigo-200 bg-indigo-50 text-indigo-900",
    "border-violet-200 bg-violet-50 text-violet-900",
    "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900",
    "border-rose-200 bg-rose-50 text-rose-900",
    "border-amber-200 bg-amber-50 text-amber-900",
    "border-lime-200 bg-lime-50 text-lime-900",
  ];
  const idx = strHash(b || "brand") % BRAND_PALETTE.length;
  return BRAND_PALETTE[idx];
}

/* =================== Skeletons =================== */
const TableSkeletonRows: React.FC<{ cols: number; rows?: number }> = ({
  cols,
  rows = 6,
}) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={`sk-${i}`} className="border-t border-neutral-100">
        {Array.from({ length: cols }).map((__, j) => (
          <td key={`sk-${i}-${j}`} className="px-4 py-3">
            <div className="h-4 w-full max-w-[240px] animate-pulse rounded bg-neutral-200/70" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/* =================== Page =================== */
const SolicitantesPage: React.FC = () => {
  const [q, setQ] = useState<string>("");
  const qDebounced = useDebouncedValue<string>(q, 400);

  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiList<SolicitanteRow> | null>(null);

  // selección modal
  const [selected, setSelected] = useState<SolicitanteForDetail | null>(null);
  const [openDetail, setOpenDetail] = useState<boolean>(false);

  // filtros
  type EmpresaOpt = { id: number; nombre: string };
  const [empresaOptions, setEmpresaOptions] = useState<EmpresaOpt[]>([]);
  const [empresaFilterId, setEmpresaFilterId] = useState<number | null>(null);
  const empresaFilterName = useMemo(
    () =>
      empresaOptions.find((e) => e.id === empresaFilterId)?.nombre ?? null,
    [empresaFilterId, empresaOptions]
  );

  // anti-race
  const reqSeqRef = useRef(0);
  const totalsSeqRef = useRef(0);

  // Totales globales
  type Totals = { solicitantes: number; empresas: number; equipos: number };
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loadingTotals, setLoadingTotals] = useState<boolean>(false);
  const [errorTotals, setErrorTotals] = useState<string | null>(null);

  const canPrev = page > 1;
  const canNext = useMemo(
    () => (data ? page < data.totalPages : false),
    [data, page]
  );

  const showingRange = useMemo(() => {
    if (!data || data.total === 0) return null;
    const start = (data.page - 1) * data.pageSize + 1;
    const end = Math.min(data.page * data.pageSize, data.total);
    return { start, end };
  }, [data]);

  /* ======== FETCH LISTA ======== */
  async function fetchList(signal?: AbortSignal) {
    const seq = ++reqSeqRef.current;
    try {
      setLoading(true);
      setError(null);

      const url = new URL(`${API_URL}/solicitantes`);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(PAGE_SIZE));

      // Si hay filtro de empresa, tiene prioridad sobre la búsqueda libre
      const qParam = (empresaFilterName ?? qDebounced).trim();
      if (qParam) url.searchParams.set("q", qParam);

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

      if (res.status === 304) {
        setLoading(false);
        return;
      }
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
        const json = (await res.json()) as ApiList<SolicitanteRow>;
        setData(json);
      } else {
        const text = await res.text();
        if (text) {
          try {
            const json = JSON.parse(text) as ApiList<SolicitanteRow>;
            setData(json);
          } catch {
            setData({ page, pageSize: PAGE_SIZE, total: 0, totalPages: 1, items: [] });
          }
        } else {
          setData({ page, pageSize: PAGE_SIZE, total: 0, totalPages: 1, items: [] });
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error)?.message || "Error al cargar");
    } finally {
      if (seq === reqSeqRef.current) setLoading(false);
    }
  }

  /* ======== FETCH TOTALES + OPCIONES DE EMPRESA ======== */
  async function fetchTotals(signal?: AbortSignal) {
    const seq = ++totalsSeqRef.current;
    try {
      setLoadingTotals(true);
      setErrorTotals(null);

      // Cuando hay filtro de empresa, usarlo para los totales también.
      const qParam = (empresaFilterName ?? qDebounced).trim();

      // Intentar endpoint /solicitantes/metrics (si existe)
      try {
        const urlM = new URL(`${API_URL}/solicitantes/metrics`);
        if (qParam) urlM.searchParams.set("q", qParam);
        urlM.searchParams.set("_ts", String(Date.now()));
        const token = localStorage.getItem("accessToken");
        const r = await fetch(urlM.toString(), {
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
        if (seq !== totalsSeqRef.current) return;
        if (r.ok) {
          const ct = r.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const m = (await r.json()) as Partial<Totals>;
            if (
              typeof m.solicitantes === "number" &&
              typeof m.empresas === "number" &&
              typeof m.equipos === "number"
            ) {
              setTotals({
                solicitantes: m.solicitantes,
                empresas: m.empresas,
                equipos: m.equipos,
              });
              // si el backend ofreciera también un listado de empresas, podríamos setEmpresaOptions aquí
              return;
            }
          }
        }
      } catch {
        // pasa al fallback
      }

      // Fallback: recorrer todas las páginas y computar totales + opciones de empresa
      let solicitantesTotal = 0;
      const empresasSet = new Map<number, string>(); // id -> nombre
      let equiposTotal = 0;

      const baseUrl = new URL(`${API_URL}/solicitantes`);
      baseUrl.searchParams.set("page", "1");
      baseUrl.searchParams.set("pageSize", String(MAX_PAGE_SIZE));
      if (qParam) baseUrl.searchParams.set("q", qParam);
      baseUrl.searchParams.set("_ts", String(Date.now()));

      const token = localStorage.getItem("accessToken");
      const firstRes = await fetch(baseUrl.toString(), {
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

      if (seq !== totalsSeqRef.current) return;
      if (!firstRes.ok) throw new Error(`Totals HTTP ${firstRes.status}`);

      const first = (await firstRes.json()) as ApiList<SolicitanteRow>;
      const totalPages = first.totalPages || 1;

      const consume = (pageData: ApiList<SolicitanteRow>) => {
        solicitantesTotal += pageData.items.length;
        for (const it of pageData.items) {
          const id = it.empresa?.id_empresa;
          if (typeof id === "number") {
            empresasSet.set(id, it.empresa!.nombre);
          }
          equiposTotal += it.equipos?.length ?? 0;
        }
      };

      consume(first);

      for (let p = 2; p <= totalPages; p++) {
        if (signal?.aborted) return;
        const u = new URL(`${API_URL}/solicitantes`);
        u.searchParams.set("page", String(p));
        u.searchParams.set("pageSize", String(MAX_PAGE_SIZE));
        if (qParam) u.searchParams.set("q", qParam);
        u.searchParams.set("_ts", String(Date.now()));

        const r = await fetch(u.toString(), {
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

        if (seq !== totalsSeqRef.current) return;
        if (!r.ok) throw new Error(`Totals HTTP ${r.status}`);

        const pj = (await r.json()) as ApiList<SolicitanteRow>;
        consume(pj);
      }

      setTotals({
        solicitantes: solicitantesTotal,
        empresas: empresasSet.size,
        equipos: equiposTotal,
      });

      // construir opciones para filtro (ordenadas)
      const opts = Array.from(empresasSet.entries())
        .map(([id, nombre]) => ({ id, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      setEmpresaOptions(opts);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setErrorTotals((err as Error)?.message || "Error al cargar totales");
      // fallback mínimo si hay data cargada
      if (data) {
        const empresasSet = new Map<number, string>();
        let equipos = 0;
        for (const it of data.items) {
          const id = it.empresa?.id_empresa;
          if (typeof id === "number") empresasSet.set(id, it.empresa!.nombre);
          equipos += it.equipos?.length ?? 0;
        }
        setTotals({
          solicitantes: data.total,
          empresas: empresasSet.size,
          equipos,
        });
        setEmpresaOptions(
          Array.from(empresasSet.entries())
            .map(([id, nombre]) => ({ id, nombre }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
        );
      }
    } finally {
      if (seq === totalsSeqRef.current) setLoadingTotals(false);
    }
  }

  /* ======== Effects ======== */
  useEffect(() => {
    const ctrl = new AbortController();
    fetchList(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, qDebounced, empresaFilterName]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchTotals(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced, empresaFilterName]);

  const goPrev = () => canPrev && setPage((p) => p - 1);
  const goNext = () => canNext && setPage((p) => p + 1);

  /* ======== Handlers ======== */
  const openRow = (row: SolicitanteRow) => {
    const detail: SolicitanteForDetail = {
      id_solicitante: row.id_solicitante,
      nombre: row.nombre,
      empresaId: row.empresaId,
      empresa: row.empresa,
      equipos: row.equipos,
    };
    setSelected(detail);
    setOpenDetail(true);
  };
  const closeDetail = () => setOpenDetail(false);

  const clearSearch = () => {
    setQ("");
    setPage(1);
    const ctrl1 = new AbortController();
    fetchList(ctrl1.signal);
    const ctrl2 = new AbortController();
    fetchTotals(ctrl2.signal);
  };

  const clearEmpresaFilter = () => {
    setEmpresaFilterId(null);
    setPage(1);
  };

  const manualReload = () => {
    const ctrl1 = new AbortController();
    fetchList(ctrl1.signal);
    const ctrl2 = new AbortController();
    fetchTotals(ctrl2.signal);
  };

  /* =================== UI =================== */
  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/40 via-white to-white">
      <Header />

      <main className="p-6 max-w-6xl mx-auto">
        {/* Barra superior: título + búsqueda + filtro empresa */}
        <header className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-end">
          <div className="sm:col-span-5">
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
              Solicitantes
            </h1>
            <p className="text-sm text-neutral-500">
              Gestión de solicitantes, empresas y equipos — RIDS
            </p>
          </div>

          {/* Búsqueda libre */}
          <div className="relative sm:col-span-4">
            <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nombre o empresa..."
              className={clsx(
                "w-full rounded-2xl border border-neutral-300 bg-white pl-9 pr-10 py-2.5",
                "focus:outline-none focus:ring-2 focus:ring-cyan-600/30 focus:border-cyan-600/50"
              )}
              aria-label="Buscar solicitantes por nombre o empresa"
              disabled={empresaFilterId !== null}
            />
            {q.length > 0 && empresaFilterId === null && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                aria-label="Limpiar búsqueda"
                title="Limpiar"
              >
                <CloseCircleFilled />
              </button>
            )}
            {empresaFilterId !== null && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
                Filtro de empresa activo
              </div>
            )}
          </div>

          {/* Filtro por empresa */}
          <div className="sm:col-span-3">
            <div className="flex gap-2">
              <select
                value={empresaFilterId ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setEmpresaFilterId(v ? Number(v) : null);
                  setPage(1);
                }}
                className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600/30 focus:border-cyan-600/50"
                aria-label="Filtrar por empresa"
              >
                <option value="">— Filtrar por empresa —</option>
                {empresaOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.nombre}
                  </option>
                ))}
              </select>
              {empresaFilterId !== null && (
                <button
                  onClick={clearEmpresaFilter}
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-300 text-emerald-800 px-3 py-2 hover:bg-emerald-50"
                  title="Quitar filtro de empresa"
                  aria-label="Quitar filtro de empresa"
                >
                  <ClearOutlined />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Chips (TOTALES) */}
        <div className="mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-3 flex items-center gap-3">
            <TeamOutlined className="text-cyan-700 text-lg" />
            <div>
              <div className="text-xs uppercase tracking-wide text-cyan-800/80">
                Solicitantes (total)
              </div>
              <div className="text-lg font-semibold text-cyan-900">
                {loadingTotals && <LoadingOutlined className="mr-1" />}
                {totals?.solicitantes ?? "—"}
              </div>
              {errorTotals && (
                <div className="text-[11px] text-red-600 mt-1">{errorTotals}</div>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-3 flex items-center gap-3">
            <ApartmentOutlined className="text-cyan-700 text-lg" />
            <div>
              <div className="text-xs uppercase tracking-wide text-cyan-800/80">
                Empresas diferentes (total)
              </div>
              <div className="text-lg font-semibold text-cyan-900">
                {loadingTotals && <LoadingOutlined className="mr-1" />}
                {totals?.empresas ?? "—"}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-3 flex items-center gap-3">
            <LaptopOutlined className="text-cyan-700 text-lg" />
            <div>
              <div className="text-xs uppercase tracking-wide text-cyan-800/80">
                Equipos (total)
              </div>
              <div className="text-lg font-semibold text-cyan-900">
                {loadingTotals && <LoadingOutlined className="mr-1" />}
                {totals?.equipos ?? "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <section
          className="rounded-3xl border border-cyan-100 shadow-sm shadow-cyan-100/40 bg-white overflow-hidden"
          aria-live="polite"
          aria-busy={loading ? "true" : "false"}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-cyan-50 text-cyan-900 sticky top-0 z-10 border-b border-cyan-100">
                <tr>
                  <th scope="col" className="text-left px-4 py-3 w-[80px] font-semibold">
                    ID
                  </th>
                  <th scope="col" className="text-left px-4 py-3 min-w-[240px] font-semibold">
                    Nombre
                  </th>
                  <th scope="col" className="text-left px-4 py-3 min-w-[240px] font-semibold">
                    Empresa
                  </th>
                  <th scope="col" className="text-left px-4 py-3 min-w-[280px] font-semibold">
                    Equipos
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && <TableSkeletonRows cols={4} rows={8} />}

                {!loading && error && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                )}

                {!loading && !error && data?.items?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12">
                      <div className="flex flex-col items-center gap-3 text-neutral-600">
                        <span>No encontramos resultados</span>
                        <div className="flex gap-2">
                          <button
                            onClick={clearSearch}
                            className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 text-cyan-800 px-3 py-2 text-sm hover:bg-cyan-50"
                            disabled={empresaFilterId !== null}
                            title={
                              empresaFilterId !== null
                                ? "Quita el filtro de empresa para limpiar búsqueda"
                                : "Limpiar búsqueda"
                            }
                          >
                            <CloseCircleFilled />
                            Limpiar
                          </button>
                          <button
                            onClick={manualReload}
                            className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 text-cyan-800 px-3 py-2 text-sm hover:bg-cyan-50"
                          >
                            <ReloadOutlined />
                            Recargar
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  data?.items?.map((s) => (
                    <tr
                      key={s.id_solicitante}
                      tabIndex={0}
                      onClick={() => openRow(s)}
                      onKeyDown={(e) => (e.key === "Enter" ? openRow(s) : null)}
                      className={clsx(
                        "border-t border-neutral-100 transition-colors cursor-pointer",
                        "odd:bg-white even:bg-neutral-50/30 hover:bg-cyan-50/70 focus-visible:outline-none focus-visible:bg-cyan-50"
                      )}
                      title="Ver detalle"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-neutral-700">
                        {s.id_solicitante}
                      </td>
                      <td className="px-4 py-3 text-neutral-900">
                        <div className="max-w-[420px] truncate" title={s.nombre}>
                          {s.nombre}
                        </div>
                      </td>

                      {/* Empresa: color único por empresa */}
                      <td className="px-4 py-3">
                        {s.empresa?.nombre ? (
                          <span
                            className={clsx(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
                              companyTagClasses(s.empresa)
                            )}
                          >
                            {s.empresa.nombre}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      {/* Equipos: color por marca */}
                      <td className="px-4 py-3">
                        {s.equipos.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {s.equipos.map((e) => {
                              const label = e.marca ?? "Equipo";
                              const title = [e.marca, e.modelo, e.serial].filter(Boolean).join(" · ");
                              return (
                                <span
                                  key={e.id_equipo}
                                  className={clsx(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border",
                                    brandTagClasses(e.marca)
                                  )}
                                  title={title}
                                >
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-neutral-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-white border-t border-cyan-100">
            <div className="text-sm text-neutral-700">
              {data ? (
                <span>
                  {showingRange ? (
                    <>
                      Mostrando <strong>{showingRange.start}</strong>–
                      <strong>{showingRange.end}</strong> de{" "}
                      <strong>{data.total}</strong> •{" "}
                    </>
                  ) : null}
                  Página <strong>{data.page}</strong> de{" "}
                  <strong>{data.totalPages}</strong>
                </span>
              ) : (
                <span>—</span>
              )}
            </div>

            <div className="flex items-center gap-2">
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

      {/* Modal de detalle */}
      <SolicitanteDetailModal
        open={openDetail}
        onClose={closeDetail}
        solicitante={selected}
      />
    </div>
  );
};

export default SolicitantesPage;
