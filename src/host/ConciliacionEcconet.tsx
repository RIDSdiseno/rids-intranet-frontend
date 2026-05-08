import React, { useEffect, useMemo, useState } from "react";
import { BarChartOutlined } from "@ant-design/icons";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { getConciliacionesByProvider, getAllConciliaciones, saveAllConciliaciones, resetSeed, updateConciliacion, saveOverride, applyOverrides, removeOverride } from "../lib/conciliacionCache";
import type { ConciliacionRecord } from "../lib/conciliacionCache";

const currency = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

export default function ConciliacionEcconet() {
  const [rows, setRows] = useState<ConciliacionRecord[]>([]);
  const now = new Date();
  const [month, setMonth] = useState<number | string>(now.getMonth() + 1);
  const [year, setYear] = useState<number | string>(now.getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showUnconciliarConfirm, setShowUnconciliarConfirm] = useState(false);
  const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>("");
  const [editDueId, setEditDueId] = useState<string | null>(null);
  const [editDueValue, setEditDueValue] = useState<string>("");
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTargetId, setReminderTargetId] = useState<string | null>(null);

  const userEmail = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? (JSON.parse(raw)?.email ?? null) : null;
    } catch {
      return null;
    }
  }, []);

  function applyFilters(data: ConciliacionRecord[]) {
    if (!month && !year) return data;

    return data.filter((r) => {
      if (!r.fecha_emision) return false;
      try {
        const d = new Date(r.fecha_emision);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();

        if (month !== "" && Number(month) !== m) return false;
        if (year !== "" && Number(year) !== y) return false;
        return true;
      } catch {
        return false;
      }
    });
  }

  function reload() {
    const all = getAllConciliaciones();

    async function fetchAndReplace() {
      if (month && year) {
        try {
          const remote = await fetchFacturasFromAPI("ECCONET", month, year);
          // normalize remote rows and preserve any local conciliacion data if present
          const localByKey = new Map<string, ConciliacionRecord>();
          all.filter(a => a.provider === "ECCONET").forEach(a => {
            const key = a.folio != null ? `${a.provider}-${String(a.folio)}` : a.id;
            localByKey.set(key, a);
          });

          const normalizedRemote = remote.map((r) => {
            const key = r.folio != null ? `${r.provider}-${String(r.folio)}` : r.id;
            const local = localByKey.get(key);
            const mergedRow: ConciliacionRecord = {
              ...r,
              estado_conciliacion: local?.estado_conciliacion ?? r.estado_conciliacion ?? "NO_CONCILIADA",
              forma_pago: local?.forma_pago ?? r.forma_pago ?? null,
              responsable: local?.responsable ?? r.responsable ?? null,
              fecha_conciliacion: local?.fecha_conciliacion ?? r.fecha_conciliacion ?? null,
              fecha_limite: local?.fecha_limite ?? r.fecha_limite ?? null,
            };
            return mergedRow;
          });

            let merged = [...all.filter((x) => x.provider !== "ECCONET"), ...normalizedRemote];
            merged = applyOverrides(merged);
            saveAllConciliaciones(merged);
            setRows(applyFilters(merged.filter((r) => r.provider === "ECCONET")));
          return;
        } catch (e: any) {
          const msg = `No se pudieron traer facturas desde el backend: ${e?.message ?? e}`;
          // eslint-disable-next-line no-console
          console.error(msg, e);
          try { alert(msg); } catch {}
        }
      }

      // fallback: ensure defaults but preserve any existing conciliacion data
      const normalized = all.map((r) => {
        if (r.provider === "ECCONET") {
          return {
            ...r,
            estado_conciliacion: r.estado_conciliacion ?? "NO_CONCILIADA",
            forma_pago: r.forma_pago ?? null,
            responsable: r.responsable ?? null,
            fecha_conciliacion: r.fecha_conciliacion ?? null,
          } as ConciliacionRecord;
        }
        return r;
      });

      saveAllConciliaciones(normalized);
      setRows(applyFilters(normalized.filter((r) => r.provider === "ECCONET")));
    }

    void fetchAndReplace();
  }

  async function fetchFacturasFromAPI(provider: "RIDS" | "ECCONET", m: number | string, y: number | string) {
    const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
    const mesStr = String(m).padStart(2, "0");
    const anoStr = String(y);

    const empresaParam = provider === "RIDS" ? "rids" : "econnet";

    const params = new URLSearchParams({ mes: mesStr, ano: anoStr, empresa: empresaParam });

    const token = localStorage.getItem("accessToken") ?? "";

    const endpoint = `${BASE_URL}/facturas/ventas?${params.toString()}`;

    const res = await fetch(endpoint, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error ?? `Error ${res.status}`);
    }

    const json = await res.json();
    const data = json?.data ?? json;
    const docs = data?.ventas ?? data?.detalleVentas ?? data ?? [];

    const mapped: ConciliacionRecord[] = (Array.isArray(docs) ? docs : []).map((doc: any) => ({
      id: `${provider}-${doc.folio}-${doc.fechaEmision ?? doc.fecha_emision ?? ''}`,
      provider,
      empresa: provider === "RIDS" ? "RIDS" : (doc.empresaEmisora ?? doc.empresa ?? provider),
      fecha_emision: doc.fechaEmision ?? doc.fecha_emision,
      tipo_dte: String(doc.tipoDTE ?? doc.tipo_dte ?? ""),
      folio: doc.folio,
      cliente: doc.razonSocialReceptor ?? doc.cliente ?? doc.razonSocialProveedor ?? "",
      rut_cliente: doc.rutReceptor ?? doc.rut_cliente ?? doc.rutProveedor ?? "",
      neto: Number(doc.montoNeto ?? doc.monto_neto ?? doc.neto ?? 0),
      iva: Number(doc.montoIVA ?? doc.monto_iva ?? doc.iva ?? 0),
      total: Number(doc.montoTotal ?? doc.monto_total ?? doc.total ?? 0),
      estado_rcv: doc.estado ?? "",
      estado_conciliacion: "NO_CONCILIADA",
      forma_pago: null,
      responsable: null,
      fecha_conciliacion: null,
    }));

    return mapped;
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  function handleConciliar(id: string) {
    const rec = rows.find((x) => x.id === id) as ConciliacionRecord | undefined;
    setSelectedId(id);
    setSelectedDate(new Date().toISOString().slice(0, 10));
    setSelectedPaymentType(rec?.forma_pago ?? "");
    setShowModal(true);
  }

  function handleCancel() {
    setShowModal(false);
    setSelectedId(null);
  }

  function handleConfirm() {
    if (!selectedId) return;

    try {
      const nowIso = new Date().toISOString();
      const patch: Partial<ConciliacionRecord> = {
        fecha_conciliacion: nowIso,
        responsable: userEmail ?? "-",
        estado_conciliacion: "CONCILIADA",
        forma_pago: selectedPaymentType || null,
      };

      const res = updateConciliacion(selectedId, patch);
      if (!res) {
        throw new Error("Registro no encontrado para actualizar");
      }

      try { saveOverride(selectedId, patch); } catch {}

      setRows(applyFilters(getConciliacionesByProvider("ECCONET")));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Error al confirmar conciliación ECCONET", e);
      try { alert("No se pudo confirmar la conciliación"); } catch {}
    }

    setShowModal(false);
    setSelectedId(null);
  }

  function handleDesconciliar(id: string) {
    try {
      const patch: Partial<ConciliacionRecord> = {
        estado_conciliacion: "NO_CONCILIADA",
        forma_pago: null,
        responsable: null,
        fecha_conciliacion: null,
      };

      const res = updateConciliacion(id, patch);
      if (!res) throw new Error("Registro no encontrado para desconciliar");
      try { removeOverride(id); } catch {}
      setRows(applyFilters(getConciliacionesByProvider("ECCONET")));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Error al desconciliar ECCONET", e);
      try { alert("No se pudo revertir la conciliación"); } catch {}
    }
  }

  function openUnconciliarConfirm(id: string) {
    setConfirmTargetId(id);
    setShowUnconciliarConfirm(true);
  }

  function closeUnconciliarConfirm() {
    setConfirmTargetId(null);
    setShowUnconciliarConfirm(false);
  }

  function openReminder(id: string) {
    setReminderTargetId(id);
    setShowReminderModal(true);
  }

  function closeReminder() {
    setReminderTargetId(null);
    setShowReminderModal(false);
  }

  function confirmUnconciliar() {
    if (!confirmTargetId) return;
    handleDesconciliar(confirmTargetId);
    closeUnconciliarConfirm();
  }

  function toggleMenu(id: string) {
    setMenuOpenId((cur) => (cur === id ? null : id));
  }

  function closeMenu() {
    setMenuOpenId(null);
  }

  const CustomPieTooltip: React.FC<{ active?: boolean; payload?: any; rows: ConciliacionRecord[] }> = ({ active, payload, rows }) => {
    if (!active || !payload || !Array.isArray(payload) || payload.length === 0) return null;

    const conciliadas = rows.filter((r) => r.estado_conciliacion === "CONCILIADA").length;
    const vencidas = rows.filter((r) => r.estado_conciliacion !== "CONCILIADA" && r.fecha_limite && new Date(r.fecha_limite) < new Date()).length;
    const pendientes = rows.filter((r) => r.estado_conciliacion !== "CONCILIADA" && (!r.fecha_limite || new Date(r.fecha_limite) >= new Date())).length;
    const item = payload[0];
    const name = String(item?.name ?? "").toLowerCase();

    let primaryNumber = conciliadas;
    let primaryLabel = "Conciliadas";
    let colorClass = "text-green-700";

    if (name.includes("pendiente")) {
      primaryNumber = pendientes;
      primaryLabel = "Pendientes";
      colorClass = "text-yellow-700";
    } else if (name.includes("vencida")) {
      primaryNumber = vencidas;
      primaryLabel = "Vencidas";
      colorClass = "text-red-700";
    }

    return (
      <div
        className={`rounded-md px-3 py-2 text-center ${colorClass}`}
        style={{ backgroundColor: "#ffffff", boxShadow: "0 6px 18px rgba(2,6,23,0.08)", border: "1px solid rgba(2,6,23,0.06)", zIndex: 9999 }}
      >
        <div className="text-sm font-semibold">{primaryNumber}</div>
        <div className="text-xs text-slate-400 mt-1">{primaryLabel}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-cyan-50 p-6">
      <div className="mx-auto w-full max-w-screen-2xl">
        <section className="rounded-2xl border border-cyan-200 bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50">
                <BarChartOutlined className="text-xl text-cyan-600" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">Conciliación ECCONET</h1>
                <p className="text-sm text-slate-500">Registro de conciliaciones — datos en tiempo real</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-full border border-cyan-200 bg-cyan-50 p-1">
                <button className="rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500">ECCONET</button>
              </div>

              <div className="flex rounded-full border border-cyan-200 bg-cyan-50 p-1">
                <button className={`rounded-full px-4 py-1.5 text-xs font-semibold ${"text-slate-500"}`}>Conciliación</button>
              </div>

              <select
                value={String(month).padStart(2, "0")}
                onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : "")}
                className="rounded-full border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="01">Enero</option>
                <option value="02">Febrero</option>
                <option value="03">Marzo</option>
                <option value="04">Abril</option>
                <option value="05">Mayo</option>
                <option value="06">Junio</option>
                <option value="07">Julio</option>
                <option value="08">Agosto</option>
                <option value="09">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>

              <select
                value={String(year)}
                onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
                className="rounded-full border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option>{new Date().getFullYear()}</option>
                <option>2027</option>
                <option>2026</option>
                <option>2025</option>
                <option>2024</option>
              </select>

              <button
                onClick={reload}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white px-4 py-2 text-sm text-cyan-700 hover:bg-cyan-50"
              >
                Recargar
              </button>

              <button onClick={() => { setMonth(4); setYear(2026); }} className="rounded-full border border-cyan-200 bg-white px-3 py-1 text-sm">Abril 2026</button>
              <button onClick={() => { resetSeed(); reload(); }} title="Restablecer datos de ejemplo" className="rounded-full border border-red-200 bg-white px-3 py-1 text-sm text-red-600">Restablecer datos</button>
            </div>
          </div>
        </section>

        {/* Dashboards */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-cyan-100 bg-white px-4 py-4 shadow-sm">
            <div className="text-sm text-slate-500">Total</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{currency.format(rows.reduce((s, r) => s + (r.total ?? 0), 0))}</div>
            <div className="text-xs text-slate-400">IVA incluido</div>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-white px-4 py-4 shadow-sm">
            <div className="text-sm text-slate-500">Pagado (Confirmado)</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {currency.format(rows.filter(r => r.estado_rcv === 'CONFIRMADO' || r.estado_conciliacion === 'CONCILIADA').reduce((s, r) => s + (r.total ?? 0), 0))}
            </div>
            <div className="text-xs text-slate-400">Documentos confirmados</div>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-white px-4 py-4 shadow-sm">
            <div className="text-sm text-slate-500">Por Pagar (Por Confirmar)</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {currency.format(rows.filter(r => r.estado_rcv !== 'CONFIRMADO' && r.estado_conciliacion !== 'CONCILIADA').reduce((s, r) => s + (r.total ?? 0), 0))}
            </div>
            <div className="text-xs text-slate-400">Pendientes por confirmar</div>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-white px-4 py-4 shadow-sm">
            <div className="text-sm text-slate-500">Documentos</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{rows.length}</div>
            <div className="text-xs text-slate-400">total del periodo</div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="col-span-2 rounded-2xl border border-cyan-100 bg-white px-4 py-4 shadow-sm">
            <div className="text-sm text-slate-600">Desglose de Facturas</div>
            <div className="mt-4 flex items-center justify-center">
              {rows.length === 0 ? (
                <div className="mt-6 flex items-center justify-center text-sm text-slate-400">Sin datos</div>
              ) : (
                <div className="relative w-full max-w-md">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Conciliada", value: rows.filter(r => r.estado_conciliacion === 'CONCILIADA').length },
                          { name: "Pendiente", value: rows.filter(r => r.estado_conciliacion !== 'CONCILIADA' && (!r.fecha_limite || new Date(r.fecha_limite) >= new Date())).length },
                          { name: "Vencida", value: rows.filter(r => r.estado_conciliacion !== 'CONCILIADA' && r.fecha_limite && new Date(r.fecha_limite) < new Date()).length }
                        ]}
                        innerRadius={60}
                        outerRadius={90}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={2}
                        labelLine={false}
                      >
                        <Cell key="c1" fill="#10B981" />
                        <Cell key="c2" fill="#F59E0B" />
                        <Cell key="c3" fill="#EF4444" />
                      </Pie>
                      <Tooltip
                        content={<CustomPieTooltip rows={rows} />}
                        wrapperStyle={{ backgroundColor: '#ffffff', boxShadow: '0 6px 18px rgba(2,6,23,0.08)', border: '1px solid rgba(2,6,23,0.06)', zIndex: 9999 }}
                        contentStyle={{ backgroundColor: 'transparent', boxShadow: 'none', border: 'none' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                    <div className="mt-4 flex items-center justify-around">
                    <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#10B981]" /> <div className="text-sm">Conciliadas ({rows.filter(r => r.estado_conciliacion === 'CONCILIADA').length})</div></div>
                    <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#F59E0B]" /> <div className="text-sm">Pendientes ({rows.filter(r => r.estado_conciliacion !== 'CONCILIADA' && (!r.fecha_limite || new Date(r.fecha_limite) >= new Date())).length})</div></div>
                    <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#EF4444]" /> <div className="text-sm">Vencidas ({rows.filter(r => r.estado_conciliacion !== 'CONCILIADA' && r.fecha_limite && new Date(r.fecha_limite) < new Date()).length})</div></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-white px-4 py-4 shadow-sm">
            <div className="text-sm text-slate-600">Resumen</div>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-center">
                <div className="text-sm font-semibold text-green-700">Pagadas (Conciliadas)</div>
                <div className="mt-2 text-xl font-bold text-green-800">{currency.format(rows.filter(r => r.estado_conciliacion === 'CONCILIADA').reduce((s, r) => s + (r.total ?? 0), 0))}</div>
                <div className="text-xs text-green-600">Total conciliado</div>
              </div>

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-4 text-center">
                <div className="text-sm font-semibold text-yellow-700">Por Pagar (Pendientes)</div>
                <div className="mt-2 text-xl font-bold text-yellow-800">{currency.format(rows.filter(r => r.estado_conciliacion !== 'CONCILIADA' && (!r.fecha_limite || new Date(r.fecha_limite) >= new Date())).reduce((s, r) => s + (r.total ?? 0), 0))}</div>
                <div className="text-xs text-yellow-600">Pendientes</div>
              </div>

              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-center">
                <div className="text-sm font-semibold text-red-700">Vencidas</div>
                <div className="mt-2 text-xl font-bold text-red-800">{currency.format(rows.filter(r => r.estado_conciliacion !== 'CONCILIADA' && r.fecha_limite && new Date(r.fecha_limite) < new Date()).reduce((s, r) => s + (r.total ?? 0), 0))}</div>
                <div className="text-xs text-red-600">Fecha límite expiró</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-cyan-100 bg-white px-4 py-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="px-3 py-2">Empresa</th>
                  <th className="px-3 py-2">Fecha emisión</th>
                  <th className="px-3 py-2">Tipo DTE</th>
                  <th className="px-3 py-2">Folio</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">RUT cliente</th>
                  {/* Neto e IVA removidos para pantalla de Conciliación */}
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Estado RCV</th>
                  <th className="px-3 py-2">Estado conciliación</th>
                  <th className="px-3 py-2">Fecha límite</th>
                  <th className="px-3 py-2">Forma de pago</th>
                  <th className="px-3 py-2">Responsable</th>
                  <th className="px-3 py-2">Fecha conciliación</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-3 py-3 text-sm text-slate-700">{r.empresa}</td>
                    <td className="px-3 py-3 text-sm text-slate-600">{r.fecha_emision}</td>
                    <td className="px-3 py-3 text-sm text-slate-600">{r.tipo_dte}</td>
                    <td className="px-3 py-3 text-sm font-medium text-slate-800">{r.folio}</td>
                    <td className="px-3 py-3 text-sm text-slate-700">{r.cliente}</td>
                    <td className="px-3 py-3 text-sm text-slate-600">{r.rut_cliente}</td>
                    {/* Neto e IVA removidos para pantalla de Conciliación */}
                    <td className="px-3 py-3 text-sm font-semibold text-slate-900">{currency.format(r.total ?? 0)}</td>
                    <td className="px-3 py-3 text-sm text-slate-600">{r.estado_rcv}</td>
                    <td className="px-3 py-3 text-sm">
                      {(() => {
                        let text = 'Por Conciliar';
                        let badgeClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                        if (r.estado_conciliacion === 'CONCILIADA') {
                          text = 'Pagada (Conciliada)';
                          badgeClass = 'bg-green-50 text-green-700 border-green-200';
                        } else if (r.fecha_limite) {
                          try {
                            const due = new Date(r.fecha_limite);
                            const today = new Date();
                            if (today > due) {
                              text = 'Vencida';
                              badgeClass = 'bg-red-50 text-red-700 border-red-200';
                            }
                          } catch {}
                        }

                        return (
                          <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${badgeClass}`}>
                            {text}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600">
                      {r.fecha_limite ? (
                        <div className="flex items-center gap-2">
                          <div>{r.fecha_limite}</div>
                          <button onClick={() => { setEditDueId(r.id); setEditDueValue(r.fecha_limite ?? new Date().toISOString().slice(0,10)); }} className="text-xs text-cyan-600">Editar</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditDueId(r.id); setEditDueValue(new Date().toISOString().slice(0,10)); }} className="text-xs text-slate-500">Agregar</button>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600">{r.forma_pago ?? "-"}</td>
                    <td className="px-3 py-3 text-sm text-slate-600">{r.responsable ?? "-"}</td>
                    <td className="px-3 py-3 text-sm text-slate-600">{r.fecha_conciliacion ? new Date(r.fecha_conciliacion).toLocaleString() : "-"}</td>
                        <td className="px-3 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            {r.estado_conciliacion === 'CONCILIADA' ? (
                              <button onClick={() => handleConciliar(r.id)} className={`rounded-full px-3 py-1 text-xs font-semibold bg-cyan-600 text-white hover:opacity-90`}>Editar</button>
                            ) : (
                              <button
                                onClick={() => handleConciliar(r.id)}
                                className={`rounded-full px-3 py-1 text-xs font-semibold bg-cyan-600 text-white hover:opacity-90`}>
                                Conciliar
                              </button>
                            )}

                            <div className="relative">
                              <button onClick={() => toggleMenu(r.id)} title="Más opciones" className="rounded-full px-2 py-1 text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50">⋯</button>
                              {menuOpenId === r.id && (
                                <div className="absolute right-0 mt-2 w-48 rounded-md border border-slate-200 bg-white shadow-lg">
                                  {r.estado_conciliacion === 'CONCILIADA' && (
                                    <button
                                      onClick={() => { openUnconciliarConfirm(r.id); closeMenu(); }}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                    >
                                      Desconciliar
                                    </button>
                                  )}

                                  {r.estado_conciliacion !== 'CONCILIADA' && (() => {
                                    let isVencida = false;
                                    try { isVencida = !!(r.fecha_limite && new Date(r.fecha_limite) < new Date()); } catch {}
                                    if (!isVencida) {
                                      return (
                                        <button
                                          onClick={() => { openReminder(r.id); closeMenu(); }}
                                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                        >
                                          Recordatorio
                                        </button>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
              <h3 className="text-lg font-bold">Conciliar documento</h3>

              <div className="mt-3">
                <div className="text-sm text-slate-600">Monto a conciliar</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {(() => {
                    const rec = rows.find((x) => x.id === selectedId);
                    return rec ? currency.format(rec.total ?? 0) : currency.format(0);
                  })()}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm text-slate-600">Fecha de conciliación</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm text-slate-600">Tipo de pago</label>
                <select
                  value={selectedPaymentType}
                  onChange={(e) => setSelectedPaymentType(e.target.value)}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Seleccione...</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={handleCancel}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1 text-sm font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  className="rounded-full bg-cyan-600 px-4 py-1 text-sm font-semibold text-white"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
        {showUnconciliarConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-xs rounded-lg bg-white p-6 shadow-lg">
              <h3 className="text-lg font-bold">Desconciliar factura</h3>
              <p className="mt-2 text-sm text-slate-600">¿Está seguro de que quiere Desconciliar esta factura?</p>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={closeUnconciliarConfirm}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1 text-sm font-semibold text-slate-700"
                >
                  No
                </button>
                <button
                  onClick={confirmUnconciliar}
                  className="rounded-full bg-red-500 px-4 py-1 text-sm font-semibold text-white"
                >
                  Sí
                </button>
              </div>
            </div>
          </div>
        )}
        {showReminderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-xs rounded-lg bg-white p-6 shadow-lg">
              <h3 className="text-lg font-bold">Recordatorio</h3>
              <p className="mt-2 text-sm text-slate-600">Esta función está en desarrollo; se está trabajando en ello.</p>

              <div className="mt-4 flex justify-end">
                <button onClick={closeReminder} className="rounded-full border border-slate-200 bg-white px-4 py-1 text-sm font-semibold text-slate-700">Cerrar</button>
              </div>
            </div>
          </div>
        )}
        {editDueId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
              <h3 className="text-lg font-bold">Editar fecha límite</h3>
              <div className="mt-4">
                <input type="date" value={editDueValue} onChange={(e) => setEditDueValue(e.target.value)} className="w-full rounded-md border px-3 py-2" />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => { setEditDueId(null); setEditDueValue(''); }} className="rounded-full border border-slate-200 bg-white px-4 py-1 text-sm">Cancelar</button>
                <button onClick={() => { if (editDueId) { updateConciliacion(editDueId, { fecha_limite: editDueValue }); try { saveOverride(editDueId, { fecha_limite: editDueValue }); } catch {} setRows(applyFilters(getConciliacionesByProvider('ECCONET'))); } setEditDueId(null); setEditDueValue(''); }} className="rounded-full bg-cyan-600 px-4 py-1 text-sm text-white">Guardar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
