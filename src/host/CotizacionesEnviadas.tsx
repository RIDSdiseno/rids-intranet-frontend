import React, { useEffect, useState, useMemo } from "react";
import { Pagination, Modal, notification } from "antd";
import { DeleteOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { http } from "../service/http";
import dayjs from "dayjs";

type SentEntry = {
  id: number;
  cotizacionId: number | null;
  to?: string | null;
  subject?: string | null;
  sentBy?: string | null;
  jobId?: string | null;
  meta?: any;
  sentAt: string;
  clienteNombre?: string | null;
  creadoPor?: string | null;
  fechaCreacion?: string | null;
};

const CotizacionesEnviadas: React.FC = () => {
  const [modalApi, modalContextHolder] = Modal.useModal();
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<SentEntry[]>([]);

  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [filterCliente, setFilterCliente] = useState<string | null>(null);
  const [filterGenero, setFilterGenero] = useState<string | null>(null);
  const [filterEnviadoPor, setFilterEnviadoPor] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [usuariosMap, setUsuariosMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchEntries();

    const onSent = () => fetchEntries();
    const onSetFilters = (ev: any) => {
      const d = ev?.detail || {};
      if (typeof d.search !== "undefined") setSearch(d.search);
      if (typeof d.filterCliente !== "undefined") setFilterCliente(d.filterCliente || null);
      if (typeof d.filterGenero !== "undefined") setFilterGenero(d.filterGenero || null);
      if (typeof d.filterEnviadoPor !== "undefined") setFilterEnviadoPor(d.filterEnviadoPor || null);
      if (typeof d.dateRange !== "undefined") setDateRange(d.dateRange || null);
      if (typeof d.page !== "undefined") setPage(d.page || 1);
    };

    const onRefresh = () => fetchEntries();

    window.addEventListener("cotizacion:enviada", onSent);
    window.addEventListener("cotizacionesEnviadas:setFilters", onSetFilters as EventListener);
    window.addEventListener("cotizacionesEnviadas:refresh", onRefresh as EventListener);

    return () => {
      window.removeEventListener("cotizacion:enviada", onSent);
      window.removeEventListener("cotizacionesEnviadas:setFilters", onSetFilters as EventListener);
      window.removeEventListener("cotizacionesEnviadas:refresh", onRefresh as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchEntries() {
    try {
      setLoading(true);

      // Cargar mapa de usuarios siempre (para resolver email → nombre en "Enviado por")
      try {
        const u = await http.get("/tecnicos/usuarios", { timeout: 8000 });
        if (Array.isArray(u.data)) {
          const map: Record<string, string> = {};
          u.data.forEach((user: any) => {
            if (user.email && user.nombre) map[String(user.email).toLowerCase()] = user.nombre;
          });
          setUsuariosMap(map);
        }
      } catch { /* ignore */ }

      try {
        const dbg = await http.get("/debug/cotizaciones/enviadas", { timeout: 7000 });
        setEntries(Array.isArray(dbg.data) ? dbg.data : []);
        return;
      } catch { /* fallback to protected route */ }

      const r = await http.get("/cotizaciones/enviadas", { timeout: 20000 });
      setEntries(Array.isArray(r.data) ? r.data : []);
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.message ?? String(e);
      notification.error({ message: "Error cargando cotizaciones enviadas", description: String(msg), duration: 6 });
    } finally {
      setLoading(false);
    }
  }

  const displayed = useMemo(() => {
    const filtered = entries.filter((e) => {
      // Excluir envíos del Mailer masivo — solo mostrar envíos de cotizaciones específicas
      if (e.cotizacionId === null || e.cotizacionId === undefined) return false;
      if (filterCliente) {
        const cliente = String(e.clienteNombre ?? e.meta?.clienteNombre ?? e.meta?.cliente ?? "").toLowerCase();
        if (!cliente.includes(filterCliente.toLowerCase())) return false;
      }

      if (filterGenero) {
        const genero = String(e.creadoPor ?? e.meta?.creadoPor ?? e.meta?.generadoPor ?? "").toLowerCase();
        if (!genero.includes(filterGenero.toLowerCase())) return false;
      }

      if (filterEnviadoPor) {
        const enviado = String(e.sentBy ?? "").toLowerCase();
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
        const from = dayjs(dateRange[0]).startOf("day");
        const to = dayjs(dateRange[1]).endOf("day");
        if (sent.isBefore(from) || sent.isAfter(to)) return false;
      }

      return true;
    });

    return filtered;
  }, [entries, search, dateRange, filterCliente, filterGenero, filterEnviadoPor]);

  const displayedResolved = useMemo(() => {
    return displayed.map((e) => {
      const sent = String(e.sentBy ?? "");
      const lower = sent.toLowerCase();
      const resolved = usuariosMap[lower] ?? e.meta?.sentByName ?? e.sentBy ?? null;
      return { ...e, sentByDisplay: resolved };
    });
  }, [displayed, usuariosMap]);

  const clientesList = useMemo(() => {
    const setC = new Set<string>();
    entries.forEach((e) => {
      const v = e.clienteNombre ?? e.meta?.clienteNombre ?? e.meta?.cliente ?? null;
      if (v) setC.add(v);
    });
    return Array.from(setC).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const generosList = useMemo(() => {
    const setG = new Set<string>();
    entries.forEach((e) => {
      const v = e.creadoPor ?? e.meta?.creadoPor ?? e.meta?.generadoPor ?? null;
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

  useEffect(() => {
    try {
      const clientes = clientesList;
      const generos = generosList;
      const enviados = enviadosList;
      window.dispatchEvent(new CustomEvent("cotizacionesEnviadas:lists", { detail: { clientes, generos, enviados } }));
    } catch (e) {
      // no crítico
    }
  }, [clientesList, generosList, enviadosList]);

  function handleDelete(id: number) {
    modalApi.confirm({
      title: "¿Eliminar este registro del historial de envíos?",
      icon: <ExclamationCircleOutlined />,
      okText: "Aceptar",
      cancelText: "Cancelar",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await http.delete(`/cotizaciones/enviadas/${id}`);
          setEntries((prev) => prev.filter((e) => e.id !== id));
          notification.success({ message: "Registro eliminado", duration: 3 });
        } catch (e: any) {
          notification.error({ message: "No se pudo eliminar", description: e?.response?.data?.error ?? e?.message, duration: 5 });
        }
      },
    });
  }

  const total = displayed.length;
  const pageStart = (page - 1) * pageSize;
  const pageSlice = displayedResolved.slice(pageStart, pageStart + pageSize);

  return (
    <div className="w-full">
      {modalContextHolder}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full table-fixed divide-y divide-slate-100">
            <colgroup>
              <col style={{ width: '72px' }} />
              <col style={{ width: '27%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '96px' }} />
              <col style={{ width: '148px' }} />
              <col style={{ width: '136px' }} />
              <col style={{ width: '48px' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">N°</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Cliente</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Generado por</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Fecha</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Enviado por</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">Fecha de envío</th>
                <th className="px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">Cargando...</td>
                </tr>
              ) : pageSlice.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">No hay registros</td>
                </tr>
              ) : (
                pageSlice.map((row) => (
                  <SentRow key={row.id} entry={row} onDelete={handleDelete} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-slate-400">Mostrando {Math.min(total, pageSize)} de {total} registros</div>
        <Pagination
          current={page}
          pageSize={pageSize}
          total={total}
          onChange={(p, ps) => { setPage(p); setPageSize(ps || pageSize); }}
          showSizeChanger
          size="small"
        />
      </div>
    </div>
  );
};

const SentRow: React.FC<{
  entry: SentEntry & { sentByDisplay?: string };
  onDelete: (id: number) => void;
}> = ({ entry, onDelete }) => {
  const [cot, setCot] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!entry.cotizacionId) return;
      try {
        const r = await http.get(`/cotizaciones/${entry.cotizacionId}`);
        if (mounted) setCot(r.data?.data ?? null);
      } catch (e) {
        // ignore
      }
    }
    load();
    return () => { mounted = false; };
  }, [entry.cotizacionId]);

  // Prioridad: dato en vivo desde BD > campo raíz guardado al enviar > meta (legado)
  const clienteDisplay = cot?.entidad?.nombre
    ?? entry.clienteNombre
    ?? entry.meta?.clienteNombre
    ?? entry.meta?.cliente
    ?? "-";
  const generoDisplay = cot?.tecnico?.nombre
    ?? entry.creadoPor
    ?? entry.meta?.creadoPor
    ?? entry.meta?.generadoPor
    ?? "-";
  const fechaRaw = cot?.fecha ?? entry.fechaCreacion ?? entry.meta?.fechaCreacion ?? null;
  const fechaCreacionDisplay = fechaRaw ? dayjs(fechaRaw).format("DD/MM/YYYY") : "-";

  const sentByName = (entry as any).sentByDisplay ?? entry.sentBy ?? "-";
  const initials = clienteDisplay !== "-"
    ? clienteDisplay.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()
    : "?";

  return (
    <tr className="group border-b border-slate-50 transition-colors hover:bg-cyan-50/40">
      <td className="px-4 py-3">
        <span className="inline-block rounded-lg bg-cyan-50 px-2.5 py-0.5 text-xs font-bold text-cyan-700 border border-cyan-100">
          {entry.cotizacionId}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
            {initials}
          </div>
          <span className="text-sm font-medium text-slate-800 whitespace-normal break-words leading-tight">
            {clienteDisplay}
          </span>
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-slate-600 whitespace-normal break-words">{generoDisplay}</td>
      <td className="px-3 py-3 text-xs text-slate-500">{fechaCreacionDisplay}</td>
      <td className="px-3 py-3">
        <span className="text-sm text-slate-700">{sentByName}</span>
      </td>
      <td className="px-3 py-3 text-xs text-slate-500 tabular-nums">{dayjs(entry.sentAt).format("DD/MM/YYYY HH:mm")}</td>
      <td className="px-2 py-3 text-center">
        <button
          onClick={() => onDelete(entry.id)}
          title="Eliminar registro"
          className="rounded-lg px-2 py-1.5 text-xs font-medium text-red-400 border border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-600 hover:border-red-300 transition-colors"
        >
          <DeleteOutlined />
        </button>
      </td>
    </tr>
  );
};

export default CotizacionesEnviadas;
