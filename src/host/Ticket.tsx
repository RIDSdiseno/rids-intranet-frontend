import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SearchOutlined,
  ReloadOutlined,
  CloseCircleFilled,
  LeftOutlined,
  RightOutlined,
  EyeOutlined,
} from "@ant-design/icons";

/* ===================== Tipos ===================== */
type ApiList<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: T[];
};

export type TicketRow = {
  id: number;
  subject: string;
  status: number; // 2 open, 3 pending, 4 resolved, 5 closed (FD)
  priority: number; // 1 low, 2 medium, 3 high, 4 urgent
  type?: string | null;
  requesterEmail?: string | null;
  requesterName?: string | null;
  company?: { id: number; nombre: string } | null;
  createdAt: string;
  updatedAt: string;
};

/* ===================== Config ===================== */
const PAGE_SIZE = 10;

/* ===================== Utils ===================== */
const clsx = (...xs: Array<string | undefined | null | false>) =>
  xs.filter(Boolean).join(" ");
const fmtDT = (d?: string | Date | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("es-CL");
  } catch {
    return String(d);
  }
};
const PRIORITY_TXT: Record<number, string> = {
  1: "Baja",
  2: "Media",
  3: "Alta",
  4: "Urgente",
};
const STATUS_TXT: Record<number, string> = {
  2: "Abierto",
  3: "En espera",
  4: "Resuelto",
  5: "Cerrado",
};

const StatusBadge: React.FC<{ status: number }> = ({ status }) => {
  const name = STATUS_TXT[status] || String(status);
  const klass =
    status === 5
      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
      : status === 4
      ? "bg-sky-50 text-sky-800 border border-sky-200"
      : status === 3
      ? "bg-amber-50 text-amber-800 border border-amber-200"
      : "bg-neutral-50 text-neutral-700 border border-neutral-200";
  return (
    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", klass)}>
      {name}
    </span>
  );
};

/* ===================== MOCK ===================== */
// Datos de ejemplo (solo para UI). Puedes borrarlo cuando conectes el endpoint real.
const MOCK: TicketRow[] = Array.from({ length: 37 }).map((_, i) => ({
  id: 23000 + i,
  subject:
    i % 3 === 0
      ? "Instalación impresora"
      : i % 3 === 1
      ? "Error Outlook"
      : "VPN sin conexión",
  status: i % 4 === 0 ? 5 : i % 4 === 1 ? 4 : i % 4 === 2 ? 3 : 2,
  priority: (i % 4) + 1,
  type: i % 2 ? "Soporte" : "Incidente",
  requesterEmail: i % 2 ? `user${i}@acme.com` : `colab${i}@ricoh-ladc.com`,
  requesterName: i % 2 ? `Usuario ${i}` : `Colaborador ${i}`,
  company: i % 2 ? { id: 1, nombre: "ACME" } : { id: 2, nombre: "Ricoh LADC" },
  createdAt: new Date(Date.now() - i * 36e5).toISOString(),
  updatedAt: new Date(Date.now() - i * 18e5).toISOString(),
}));

/* ===================== Página ===================== */
const TicketsPage: React.FC = () => {
  // filtros
  const [q, setQ] = useState("");
  const [empresaId, setEmpresaId] = useState<number | "">("");
  const [onlyClosed, setOnlyClosed] = useState(true);

  // paginación
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiList<TicketRow> | null>(null);
  const totalPages = useMemo(() => Math.max(1, data?.totalPages ?? 1), [data]);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  // carga/errores
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqRef = useRef(0);

  // empresas (mock derivado)
  const empresas = useMemo(() => {
    const map = new Map<number, string>();
    MOCK.forEach((t) => {
      if (t.company) map.set(t.company.id, t.company.nombre);
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, []);

  const showingRange = useMemo(() => {
    if (!data || data.total === 0) return null;
    const start = (data.page - 1) * data.pageSize + 1;
    const end = Math.min(data.page * data.pageSize, data.total);
    return { start, end };
  }, [data]);

  // ===== Mock fetch (simula API; reemplaza por fetch real cuando tengas credenciales) =====
  const fetchList = async () => {
    const seq = ++reqRef.current;
    setLoading(true);
    setError(null);
    try {
      // filtra sobre MOCK
      let items = [...MOCK];
      if (onlyClosed) items = items.filter((t) => t.status === 5);
      if (empresaId) items = items.filter((t) => t.company?.id === empresaId);
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        items = items.filter(
          (t) =>
            (t.subject || "").toLowerCase().includes(needle) ||
            (t.requesterEmail || "").toLowerCase().includes(needle) ||
            (t.requesterName || "").toLowerCase().includes(needle),
        );
      }

      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const safePage = Math.min(page, totalPages);
      const start = (safePage - 1) * PAGE_SIZE;
      const paged = items.slice(start, start + PAGE_SIZE);

      if (seq !== reqRef.current) return;
      setData({ page: safePage, pageSize: PAGE_SIZE, total, totalPages, items: paged });
    } catch (e: unknown) {
      // Si en algún momento vuelves a usar AbortController
      if (e instanceof DOMException && e.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Error al cargar tickets";
      setError(msg);
    } finally {
      if (seq === reqRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, empresaId, onlyClosed]);

  const clearAll = () => {
    setQ("");
    setEmpresaId("");
    setOnlyClosed(true);
    setPage(1);
  };

  /* =============== UI =============== */
  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/40 via-white to-white">
      <main className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
              Tickets
            </h1>
            <p className="text-sm text-neutral-500">
              Lista de tickets (mock). Filtra por empresa, texto y estado.
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
                placeholder="Buscar asunto/solicitante/email"
                className={clsx(
                  "w-full rounded-2xl border border-neutral-300 bg-white pl-9 pr-10 py-2.5",
                  "focus:outline-none focus:ring-2 focus:ring-cyan-600/30 focus:border-cyan-600/50",
                )}
                aria-label="Buscar tickets"
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

            {/* Empresa */}
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

            {/* Solo cerrados */}
            <label className="inline-flex items-center gap-2 text-sm rounded-2xl border border-cyan-300 px-3 py-2.5 bg-white">
              <input
                type="checkbox"
                checked={onlyClosed}
                onChange={(e) => {
                  setOnlyClosed(e.target.checked);
                  setPage(1);
                }}
              />
              Solo cerrados
            </label>

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
                  <th className="text-left px-4 py-3 min-w-[260px] font-semibold">Asunto</th>
                  <th className="text-left px-4 py-3 min-w-[200px] font-semibold">Empresa</th>
                  <th className="text-left px-4 py-3 min-w-[220px] font-semibold">
                    Solicitante
                  </th>
                  <th className="text-left px-4 py-3 min-w-[120px] font-semibold">Prioridad</th>
                  <th className="text-left px-4 py-3 min-w-[140px] font-semibold">Estado</th>
                  <th className="text-left px-4 py-3 min-w-[180px] font-semibold">Creado</th>
                  <th className="text-left px-4 py-3 min-w-[180px] font-semibold">
                    Actualizado
                  </th>
                  <th className="px-4 py-3 w-[70px]" />
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="border-t border-neutral-100">
                      {Array.from({ length: 9 }).map((__, j) => (
                        <td key={`sk-${i}-${j}`} className="px-4 py-3">
                          <div className="h-4 w-full max-w-[260px] animate-pulse rounded bg-neutral-200/70" />
                        </td>
                      ))}
                    </tr>
                  ))}

                {!loading && error && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                )}

                {!loading && !error && data?.items?.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-neutral-500">
                      Sin resultados.
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  data?.items?.map((t) => (
                    <tr
                      key={t.id}
                      className={clsx(
                        "border-t border-neutral-100 transition-colors",
                        "odd:bg-white even:bg-neutral-50/30 hover:bg-cyan-50/70",
                      )}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">{t.id}</td>
                      <td className="px-4 py-3">
                        <div className="max-w-[420px] truncate" title={t.subject}>
                          {t.subject}
                        </div>
                      </td>
                      <td className="px-4 py-3">{t.company?.nombre ?? "—"}</td>
                      <td className="px-4 py-3">
                        {t.requesterName ?? t.requesterEmail ?? "—"}
                      </td>
                      <td className="px-4 py-3">{PRIORITY_TXT[t.priority] || t.priority}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3">{fmtDT(t.createdAt)}</td>
                      <td className="px-4 py-3">{fmtDT(t.updatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs border-cyan-300 text-cyan-800 hover:bg-cyan-50"
                          title="Ver"
                        >
                          <EyeOutlined /> Ver
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Footer paginación */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-cyan-100">
            <div className="text-sm text-neutral-700">
              {data && data.total > 0 ? (
                <>
                  Mostrando <strong>{showingRange?.start}</strong>–<strong>{showingRange?.end}</strong>{" "}
                  de <strong>{data.total}</strong> • Página <strong>{data.page}
                  </strong> de <strong>{totalPages}</strong>
                </>
              ) : (
                "—"
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetchList();
                }}
                className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm border-cyan-300 text-cyan-800 hover:bg-cyan-50"
                title="Recargar"
              >
                <ReloadOutlined /> Recargar
              </button>
              <div className="w-px h-5 bg-cyan-100" />
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrev || loading}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                  "border-cyan-300 text-cyan-800 hover:bg-cyan-50",
                  (!canPrev || loading) && "opacity-50 cursor-not-allowed hover:bg-transparent",
                )}
              >
                <LeftOutlined />
                <span className="hidden sm:inline">Anterior</span>
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={!canNext || loading}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                  "border-cyan-300 text-cyan-800 hover:bg-cyan-50",
                  (!canNext || loading) && "opacity-50 cursor-not-allowed hover:bg-transparent",
                )}
              >
                <span className="hidden sm:inline">Siguiente</span>
                <RightOutlined />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TicketsPage;
