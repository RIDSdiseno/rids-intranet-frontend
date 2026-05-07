import React, { useEffect, useMemo, useState } from "react";
import { BarChartOutlined } from "@ant-design/icons";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { getConciliacionesByProvider, getAllConciliaciones, saveAllConciliaciones, resetSeed, updateConciliacion, saveOverride, applyOverrides, removeOverride } from "../lib/conciliacionCache";
import type { ConciliacionRecord } from "../lib/conciliacionCache";

const currency = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

export default function Conciliacion() {
  const [rows, setRows] = useState<ConciliacionRecord[]>([]);
  const now = new Date();
  const [month, setMonth] = useState<number | "">(now.getMonth() + 1);
  const [year, setYear] = useState<number | "">(now.getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>("");

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

        if (month && month !== "" && Number(month) !== m) return false;
        if (year && year !== "" && Number(year) !== y) return false;
        return true;
      } catch {
        return false;
      }
    });
  }

  function reload() {
    // If month/year are selected, try fetching real SII data for RIDS
    const all = getAllConciliaciones();

    async function fetchAndReplace() {
      if (month && year) {
        try {
          const remote = await fetchFacturasFromAPI("RIDS", month, year);
          // normalize remote rows
          // normalize remote rows and preserve any local conciliacion data if present
          const localByKey = new Map<string, ConciliacionRecord>();
          all.filter(a => a.provider === "RIDS").forEach(a => {
            const key = a.folio != null ? `${a.provider}-${String(a.folio)}` : a.id;
            localByKey.set(key, a);
          });

          const normalizedRemote = remote.map((r) => {
            const key = r.folio != null ? `${r.provider}-${String(r.folio)}` : r.id;
            const local = localByKey.get(key);
            const mergedRow: ConciliacionRecord = {
              ...r,
              empresa: "RIDS",
              estado_conciliacion: local?.estado_conciliacion ?? r.estado_conciliacion ?? "NO_CONCILIADA",
              forma_pago: local?.forma_pago ?? r.forma_pago ?? null,
              responsable: local?.responsable ?? r.responsable ?? null,
              fecha_conciliacion: local?.fecha_conciliacion ?? r.fecha_conciliacion ?? null,
            };
            return mergedRow;
          });

          // merge: keep non-RIDS rows, replace RIDS rows with remote-merged rows
          let merged = [...all.filter((x) => x.provider !== "RIDS"), ...normalizedRemote];
          // apply any saved overrides (from previous confirms)
          merged = applyOverrides(merged);
          saveAllConciliaciones(merged);
          setRows(applyFilters(merged.filter((r) => r.provider === "RIDS")));
          return;
        } catch (e: any) {
          const msg = `No se pudieron traer facturas desde el backend: ${e?.message ?? e}`;
          // eslint-disable-next-line no-console
          console.error(msg, e);
          try { alert(msg); } catch {}
        }
      }

      // Fallback: ensure defaults but preserve any existing conciliacion data
      const normalized = all.map((r) => {
        if (r.provider === "RIDS") {
          return {
            ...r,
            empresa: "RIDS",
            estado_conciliacion: r.estado_conciliacion ?? "NO_CONCILIADA",
            forma_pago: r.forma_pago ?? null,
            responsable: r.responsable ?? null,
            fecha_conciliacion: r.fecha_conciliacion ?? null,
          } as ConciliacionRecord;
        }
        return r;
      });

      saveAllConciliaciones(normalized);
      setRows(applyFilters(normalized.filter((r) => r.provider === "RIDS")));
    }

    void fetchAndReplace();
  }

  async function fetchFacturasFromAPI(provider: "RIDS" | "ECCONET", m: number | "", y: number | "") {
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

    // data may be an object with ventas array or an array itself
    const docs = data?.ventas ?? data?.detalleVentas ?? data ?? [];

    // map to ConciliacionRecord
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

      // persist override so merges won't wipe this local confirmation
      try { saveOverride(selectedId, patch); } catch {}

      // refresh view from canonical source
      setRows(applyFilters(getConciliacionesByProvider("RIDS")));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Error Al confirmar conciliación", e);
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
      setRows(applyFilters(getConciliacionesByProvider("RIDS")));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Error al desconciliar", e);
      try { alert("No se pudo revertir la conciliación"); } catch {}
    }
  }

  const CustomPieTooltip: React.FC<{ active?: boolean; payload?: any; rows: ConciliacionRecord[] }> = ({ active, payload, rows }) => {
    if (!active || !payload || !Array.isArray(payload) || payload.length === 0) return null;

    const conciliadas = rows.filter((r) => r.estado_conciliacion === "CONCILIADA").length;
    const pendientes = rows.length - conciliadas;
    const item = payload[0];
    const name = String(item?.name ?? "");
    const isPendiente = name.toLowerCase().includes("pendiente");

    const primaryNumber = isPendiente ? pendientes : conciliadas;
    const primaryLabel = isPendiente ? "Pendientes" : "Conciliadas";

    return (
      <div
        className={`rounded-md px-3 py-2 text-center ${isPendiente ? "text-slate-700" : "text-cyan-700"}`}
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
                <h1 className="text-2xl font-bold text-slate-900">Conciliación RIDS</h1>
                <p className="text-sm text-slate-500">Registro de conciliaciones — datos en tiempo real</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-full border border-cyan-200 bg-cyan-50 p-1">
                <button className="rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500">RIDS</button>
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
          {/* Totales */}
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
            <div className="text-sm text-slate-600">Conciliaciones por día</div>
            <div className="mt-4 h-40 flex items-center justify-center text-slate-400">[Gráfico placeholder]</div>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-white px-4 py-4 shadow-sm">
            <div className="text-sm text-slate-600">Estado documentos</div>
            <div className="mt-2 flex items-center justify-center">
              {rows.length === 0 ? (
                <div className="mt-6 flex items-center justify-center text-sm text-slate-400">Sin datos</div>
              ) : (
                <div className="relative h-40 w-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[{ name: "Conciliada", value: rows.filter(r => r.estado_conciliacion === 'CONCILIADA').length }, { name: "Pendiente", value: rows.filter(r => r.estado_conciliacion !== 'CONCILIADA').length }]}
                        innerRadius={48}
                        outerRadius={72}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={2}
                        labelLine={false}
                      >
                        <Cell key="c1" fill="#06b6d4" />
                        <Cell key="c2" fill="#e6f6f9" />
                      </Pie>
                      <Tooltip
                        content={<CustomPieTooltip rows={rows} />}
                        wrapperStyle={{ backgroundColor: '#ffffff', boxShadow: '0 6px 18px rgba(2,6,23,0.08)', border: '1px solid rgba(2,6,23,0.06)', zIndex: 9999 }}
                        contentStyle={{ backgroundColor: 'transparent', boxShadow: 'none', border: 'none' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-sm font-medium text-cyan-700">{Math.round((rows.filter(r => r.estado_conciliacion === 'CONCILIADA').length / Math.max(1, rows.length)) * 100)}%</div>
                    <div className="text-xs text-slate-500">Confirmada</div>
                  </div>
                </div>
              )}
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
                    <td className="px-3 py-3 text-sm text-slate-600">{r.estado_conciliacion}</td>
                    <td className="px-3 py-3 text-sm text-slate-600">{r.forma_pago ?? "-"}</td>
                    <td className="px-3 py-3 text-sm text-slate-600">{r.responsable ?? "-"}</td>
                    <td className="px-3 py-3 text-sm text-slate-600">{r.fecha_conciliacion ? new Date(r.fecha_conciliacion).toLocaleString() : "-"}</td>
                    <td className="px-3 py-3 text-sm">
                      {r.estado_conciliacion === 'CONCILIADA' ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleDesconciliar(r.id)} className="rounded-full px-3 py-1 text-xs font-semibold bg-red-500 text-white hover:opacity-90">Desconciliar</button>
                          <button onClick={() => handleConciliar(r.id)} className={`rounded-full px-3 py-1 text-xs font-semibold bg-cyan-600 text-white hover:opacity-90`}>Editar</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConciliar(r.id)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold bg-cyan-600 text-white hover:opacity-90`}>
                          Conciliar
                        </button>
                      )}
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
        </div>
      </div>
    );
  }

