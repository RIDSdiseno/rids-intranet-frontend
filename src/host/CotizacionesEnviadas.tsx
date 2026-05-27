import React, { useEffect, useState, useMemo } from "react";
import { Pagination, Input, DatePicker, notification } from "antd";
import { http } from "../service/http";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

type SentEntry = {
  id: number;
  cotizacionId: number | null;
  to?: string | null;
  subject?: string | null;
  sentBy?: string | null;
  jobId?: string | null;
  meta?: any;
  sentAt: string;
};

const CotizacionesEnviadas: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<SentEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [filterCliente, setFilterCliente] = useState<string | null>(null);
  const [filterGenero, setFilterGenero] = useState<string | null>(null);
  const [filterEnviadoPor, setFilterEnviadoPor] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  useEffect(() => {
    fetchEntries();
    const onSent = () => fetchEntries();
    window.addEventListener('cotizacion:enviada', onSent);
    return () => { window.removeEventListener('cotizacion:enviada', onSent); };
  }, []);

  async function fetchEntries() {
    try {
      setLoading(true);
      setError(null);

      // Intentamos primero la ruta debug pública (sin auth) para asegurar que la tabla muestre registros incluso si la sesión/token falla
      try {
        const dbg = await http.get("/debug/cotizaciones/enviadas", { timeout: 7000 });
        console.debug("cotizaciones enviadas (debug)", dbg.data);
        setEntries(Array.isArray(dbg.data) ? dbg.data : []);
        return;
      } catch (dbgErr) {
        console.warn("Debug endpoint failed, falling back to protected endpoint:", dbgErr);
      }

      const r = await http.get("/cotizaciones/enviadas", { timeout: 20000 });
      console.debug("cotizaciones enviadas", r.data);
      setEntries(Array.isArray(r.data) ? r.data : []);
    } catch (e: any) {
      console.error("Error fetching cotizaciones enviadas:", e);
      const msg = e?.response?.data?.error ?? e?.message ?? String(e);
      setError(String(msg));
      notification.error({ message: "Error cargando cotizaciones enviadas", description: String(msg), duration: 6 });
    } finally {
      setLoading(false);
    }
  }

  // Fetch cotizacion details for displayed items and build rows
  const displayed = useMemo(() => {
    const filtered = entries.filter((e) => {
      // filtro por cliente
      if (filterCliente) {
        const cliente = (e.clienteNombre ?? e.meta?.clienteNombre ?? "").toLowerCase();
        if (!cliente.includes(filterCliente.toLowerCase())) return false;
      }

      // filtro por quien generó
      if (filterGenero) {
        const genero = (e.creadoPor ?? "").toLowerCase();
        if (!genero.includes(filterGenero.toLowerCase())) return false;
      }

      // filtro por quien envió
      if (filterEnviadoPor) {
        const enviado = (e.sentBy ?? "").toLowerCase();
        if (!enviado.includes(filterEnviadoPor.toLowerCase())) return false;
      }

      if (search) {
        const s = search.toLowerCase();
        const inTo = String(e.to ?? "").toLowerCase().includes(s);
        const inSubject = String(e.subject ?? "").toLowerCase().includes(s);
        const inId = String(e.cotizacionId ?? "").includes(s);
        if (!(inTo || inSubject || inId)) return false;
      }

      if (dateRange && dateRange[0] && dateRange[1]) {
        const sent = dayjs(e.sentAt);
        const from = dayjs(dateRange[0]);
        const to = dayjs(dateRange[1]).endOf("day");
        if (!sent.isBetween(from, to, null, "[]")) return false;
      }

      return true;
    });

    return filtered;
  }, [entries, search, dateRange]);

  // listas únicas para selects
  const clientesList = useMemo(() => {
    const setC = new Set<string>();
    entries.forEach((e) => {
      const v = e.clienteNombre ?? e.meta?.clienteNombre ?? null;
      if (v) setC.add(v);
    });
    return Array.from(setC).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const generosList = useMemo(() => {
    const setG = new Set<string>();
    entries.forEach((e) => {
      const v = e.creadoPor ?? null;
      if (v) setG.add(v);
    });
    return Array.from(setG).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const enviadosList = useMemo(() => {
    const setE = new Set<string>();
    entries.forEach((e) => {
      const v = e.sentBy ?? null;
      if (v) setE.add(v);
    });
    return Array.from(setE).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const total = displayed.length;
  const pageStart = (page - 1) * pageSize;
  const pageSlice = displayed.slice(pageStart, pageStart + pageSize);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <header className="rounded-2xl border-2 border-cyan-100 p-6 bg-white shadow-sm mb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Cotizaciones</h1>
              <p className="text-sm text-slate-500">Gestión y seguimiento de cotizaciones.</p>

              {/* tabs removed as not needed in this view */}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => fetchEntries()} className="inline-flex items-center gap-2 rounded-full px-4 py-2 border border-cyan-200 text-cyan-700 bg-white hover:bg-cyan-50">Recargar</button>
            </div>
          </div>

          <div className="mt-6 bg-cyan-50 border border-cyan-100 rounded-xl p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <Input.Search
                placeholder="Buscar cotización, cliente o estado..."
                allowClear
                onSearch={(v) => setSearch(v)}
                className="flex-1"
                enterButton
              />

              <div className="flex items-center gap-3">
                <select className="rounded-md border px-3 py-2 text-sm bg-white" value={filterCliente ?? ""} onChange={(e) => setFilterCliente(e.target.value || null)}>
                  <option value="">Cliente</option>
                  {clientesList.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>

                <select className="rounded-md border px-3 py-2 text-sm bg-white" value={filterGenero ?? ""} onChange={(e) => setFilterGenero(e.target.value || null)}>
                  <option value="">Generado Por</option>
                  {generosList.map((g) => (<option key={g} value={g}>{g}</option>))}
                </select>

                <select className="rounded-md border px-3 py-2 text-sm bg-white" value={filterEnviadoPor ?? ""} onChange={(e) => setFilterEnviadoPor(e.target.value || null)}>
                  <option value="">Enviado Por</option>
                  {enviadosList.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>

                <input type="month" className="rounded-md border px-3 py-2 text-sm bg-white" />
              </div>
            </div>
          </div>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-cyan-50 overflow-hidden">
          <table className="min-w-full table-fixed border-separate" style={{ borderSpacing: 0 }}>
            <thead className="bg-cyan-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-800">Número de Cotización</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-800">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-800">Generado Por</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-800">Fecha creación</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-800">Enviado por</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-800">Fecha y hora envío</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">Cargando...</td>
                </tr>
              ) : pageSlice.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">No hay registros</td>
                </tr>
              ) : (
                pageSlice.map((row) => (
                  <SentRow key={row.id} entry={row} />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-500">Mostrando {Math.min(total, pageSize)} de {total} registros</div>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            onChange={(p, ps) => {
              setPage(p);
              setPageSize(ps || pageSize);
            }}
            showSizeChanger
          />
        </div>
      </div>
    </div>
  );
};

const SentRow: React.FC<{ entry: SentEntry }> = ({ entry }) => {
  const [cot, setCot] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!entry.cotizacionId) return;
      try {
        const r = await http.get(`/cotizaciones/${entry.cotizacionId}`);
        if (mounted) setCot(r.data?.data ?? null);
      } catch (e) {
        // No necesario; la UI mostrará datos desde el registro si la consulta falla
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [entry.cotizacionId]);

  const clienteDisplay = cot?.entidad?.nombre ?? entry.clienteNombre ?? entry.meta?.clienteNombre ?? "-";
  const generoDisplay = cot?.tecnico?.nombre ?? entry.creadoPor ?? "-";
  const fechaCreacionDisplay = cot?.fecha ? dayjs(cot.fecha).format("DD/MM/YYYY") : (entry.fechaCreacion ? dayjs(entry.fechaCreacion).format("DD/MM/YYYY") : "-");

  return (
    <tr>
      <td className="px-4 py-3 text-sm text-gray-700">{entry.cotizacionId ?? "-"}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{clienteDisplay}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{generoDisplay}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{fechaCreacionDisplay}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{entry.sentBy ?? "-"}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{dayjs(entry.sentAt).format("DD/MM/YYYY HH:mm")}</td>
    </tr>
  );
};

export default CotizacionesEnviadas;
