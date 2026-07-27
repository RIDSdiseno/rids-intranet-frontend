import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  FileText,
  Image as ImageIcon,
  Loader2,
  Package,
  PenLine,
  RefreshCw,
  Truck,
  UserRound,
} from "lucide-react";
import { api } from "../api/api";

type EvidenciaEntrega = {
  id: number;
  tipo: string;
  url: string;
  formato?: string | null;
  creadoEn?: string | null;
};

type EntregaIntranet = {
  id_entrega: number;
  empresaNombre: string;
  receptorNombre: string;
  fecha: string;
  origen: string | null;
  tipo: string | null;
  tecnico: { id_tecnico: number; nombre: string; email?: string | null } | null;
  evidencias: EvidenciaEntrega[];
};

type EntregasResponse = {
  entregas: EntregaIntranet[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

type FiltrosResponse = {
  empresas: string[];
  tecnicos: { id_tecnico: number; nombre: string }[];
};

const PAGE_SIZE = 30;

function formatFechaHora(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function OrigenBadge({ origen }: { origen: string | null }) {
  if (origen === "rids") {
    return (
      <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700">
        RIDS
      </span>
    );
  }
  if (origen === "econnet") {
    return (
      <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
        econnet
      </span>
    );
  }
  return <span className="text-xs text-slate-400">—</span>;
}

function TipoBadge({ tipo }: { tipo: string | null }) {
  if (tipo === "entrega") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
        <Package size={13} /> Entrega
      </span>
    );
  }
  if (tipo === "retiro") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
        <Truck size={13} /> Retiro
      </span>
    );
  }
  return <span className="text-xs text-slate-400">—</span>;
}

function EvidenciaLink({ evidencia }: { evidencia: EvidenciaEntrega }) {
  const tipo = evidencia.tipo?.toLowerCase();
  const esPdf = tipo === "pdf";
  const esFirma = tipo === "firma";
  const label = esPdf ? "Ver PDF" : esFirma ? "Firma" : "Foto";
  const Icon = esPdf ? FileText : esFirma ? PenLine : ImageIcon;

  return (
    <a
      href={evidencia.url}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
        esPdf
          ? "border-cyan-200 bg-cyan-600 text-white hover:bg-cyan-700"
          : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
      }`}
    >
      <Icon size={14} />
      {label}
    </a>
  );
}

export default function EntregasPage() {
  const [entregas, setEntregas] = useState<EntregaIntranet[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [empresas, setEmpresas] = useState<string[]>([]);
  const [tecnicos, setTecnicos] = useState<{ id_tecnico: number; nombre: string }[]>([]);

  const [empresa, setEmpresa] = useState("");
  const [tecnicoId, setTecnicoId] = useState("");
  const [origen, setOrigen] = useState("");
  const [tipo, setTipo] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    api
      .get<FiltrosResponse>("/entregas/filtros")
      .then(({ data }) => {
        setEmpresas(Array.isArray(data?.empresas) ? data.empresas : []);
        setTecnicos(Array.isArray(data?.tecnicos) ? data.tecnicos : []);
      })
      .catch(() => {
        /* silencioso: los filtros son un extra, el listado igual funciona */
      });
  }, []);

  const cargarEntregas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
      if (empresa) params.empresa = empresa;
      if (tecnicoId) params.tecnicoId = tecnicoId;
      if (origen) params.origen = origen;
      if (tipo) params.tipo = tipo;
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;

      const { data } = await api.get<EntregasResponse>("/entregas", { params });
      setEntregas(Array.isArray(data?.entregas) ? data.entregas : []);
      setTotal(data?.total ?? 0);
      setHasMore(Boolean(data?.hasMore));
    } catch (err: any) {
      const message =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        "No se pudieron cargar las entregas";
      setError(message);
      setEntregas([]);
    } finally {
      setLoading(false);
    }
  }, [page, empresa, tecnicoId, origen, tipo, desde, hasta]);

  useEffect(() => {
    cargarEntregas();
  }, [cargarEntregas]);

  // Al cambiar cualquier filtro, se vuelve a la primera página.
  useEffect(() => {
    setPage(1);
  }, [empresa, tecnicoId, origen, tipo, desde, hasta]);

  const hayFiltros = Boolean(empresa || tecnicoId || origen || tipo || desde || hasta);
  const limpiarFiltros = () => {
    setEmpresa("");
    setTecnicoId("");
    setOrigen("");
    setTipo("");
    setDesde("");
    setHasta("");
  };

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rango = useMemo(() => {
    if (total === 0) return "0";
    const inicio = (page - 1) * PAGE_SIZE + 1;
    const fin = (page - 1) * PAGE_SIZE + entregas.length;
    return `${inicio}–${fin} de ${total}`;
  }, [page, entregas.length, total]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px] space-y-5">
        {/* HEADER */}
        <section className="relative overflow-hidden rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-sky-50 p-6 shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-200/30 blur-3xl" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
                <Package size={14} />
                Comprobantes
              </span>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                PickUP
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                Comprobantes de entrega y retiro registrados por los técnicos desde la app móvil.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:w-auto">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <FileText size={14} />
                  </span>
                </div>
                <p className="mt-2 text-3xl font-black text-slate-900">{total}</p>
              </div>
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50/80 p-4 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-cyan-600">En pantalla</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
                    <Package size={14} />
                  </span>
                </div>
                <p className="mt-2 text-3xl font-black text-cyan-700">{entregas.length}</p>
              </div>
            </div>
          </div>
        </section>

        {/* FILTROS */}
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">Empresa</span>
              <select
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              >
                <option value="">Todas las empresas</option>
                {empresas.map((nombre) => (
                  <option key={nombre} value={nombre}>
                    {nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">Técnico</span>
              <select
                value={tecnicoId}
                onChange={(e) => setTecnicoId(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              >
                <option value="">Todos los técnicos</option>
                {tecnicos.map((t) => (
                  <option key={t.id_tecnico} value={t.id_tecnico}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">Origen</span>
              <select
                value={origen}
                onChange={(e) => setOrigen(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              >
                <option value="">Todos los orígenes</option>
                <option value="rids">RIDS</option>
                <option value="econnet">econnet</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">Tipo</span>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              >
                <option value="">Entregas y retiros</option>
                <option value="entrega">Solo entregas</option>
                <option value="retiro">Solo retiros</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">Desde</span>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">Hasta</span>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => cargarEntregas()}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Actualizar
            </button>
            {hayFiltros && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600"
              >
                Limpiar filtros
              </button>
            )}
            <span className="ml-auto text-sm text-slate-500">Mostrando {rango}</span>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-bold">Error al cargar entregas</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* LISTADO */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-slate-600">
                <Loader2 className="animate-spin text-cyan-600" size={30} />
                <span className="font-medium">Cargando entregas...</span>
              </div>
            </div>
          ) : entregas.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center p-8 text-center">
              <div>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <Package className="text-slate-400" size={32} />
                </div>
                <h2 className="mt-4 text-xl font-bold text-slate-900">Sin comprobantes</h2>
                <p className="mt-2 max-w-md text-slate-500">
                  {hayFiltros
                    ? "No hay entregas que coincidan con los filtros seleccionados."
                    : "Aún no se han registrado entregas desde la app móvil."}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Receptor</th>
                    <th className="px-4 py-3">Técnico</th>
                    <th className="px-4 py-3">Origen</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Comprobantes</th>
                  </tr>
                </thead>
                <tbody>
                  {entregas.map((entrega) => (
                    <tr key={entrega.id_entrega} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={14} className="text-slate-400" />
                          {formatFechaHora(entrega.fecha)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                          <Building2 size={14} className="shrink-0 text-slate-400" />
                          {entrega.empresaNombre}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{entrega.receptorNombre}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound size={14} className="text-slate-400" />
                          {entrega.tecnico?.nombre ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <OrigenBadge origen={entrega.origen} />
                      </td>
                      <td className="px-4 py-3">
                        <TipoBadge tipo={entrega.tipo} />
                      </td>
                      <td className="px-4 py-3">
                        {entrega.evidencias.length === 0 ? (
                          <span className="text-xs text-slate-400">Sin comprobantes</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {[...entrega.evidencias]
                              .sort((a, b) => (a.tipo === "pdf" ? -1 : b.tipo === "pdf" ? 1 : 0))
                              .map((evidencia) => (
                                <EvidenciaLink key={evidencia.id} evidencia={evidencia} />
                              ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* PAGINACIÓN */}
        {!loading && entregas.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Página {page} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
