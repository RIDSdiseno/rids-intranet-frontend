import React, { useEffect, useMemo, useRef, useState } from "react";

type ViteEnv = { env?: { VITE_API_URL?: string } };
const API_URL =
  ((import.meta as unknown) as ViteEnv).env?.VITE_API_URL || "http://localhost:4000/api";

export type EmpresaMini = { id: number; nombre: string };
export type TecnicoMini = { id: number; nombre: string };
type SolicitanteMini = { id: number; nombre: string };

type EstadoVisita = "PENDIENTE" | "COMPLETADA" | "CANCELADA";

// Payloads: modo UNO (compat) y modo LOTE
export type CreateVisitaPayloadSingle = {
  empresaId: number;
  tecnicoId: number;
  solicitante: string;
  inicio: string;
  fin?: string | null;
  status: EstadoVisita;
  confImpresoras: boolean;
  confTelefonos: boolean;
  confPiePagina: boolean;
  otros: boolean;
  otrosDetalle?: string | null;
  solicitanteId?: number | null;
  actualizaciones: boolean;
  antivirus: boolean;
  ccleaner: boolean;
  estadoDisco: boolean;
  licenciaOffice: boolean;
  licenciaWindows: boolean;
  mantenimientoReloj: boolean;
  rendimientoEquipo: boolean;
};

// Nuevo: para lote
export type CreateVisitaPayloadBatch = Omit<
  CreateVisitaPayloadSingle,
  "solicitante" | "solicitanteId"
> & {
  solicitantesIds?: number[];
  solicitantesNombres?: string[];
};

export type VisitaForEdit = {
  id_visita: number;
  empresaId: number;
  tecnicoId: number;
  solicitante: string;
  solicitanteId: number | null;
  inicio: string;
  fin: string | null;
  status: EstadoVisita;
  confImpresoras: boolean;
  confTelefonos: boolean;
  confPiePagina: boolean;
  otros: boolean;
  otrosDetalle: string | null;
  actualizaciones: boolean;
  antivirus: boolean;
  ccleaner: boolean;
  estadoDisco: boolean;
  licenciaOffice: boolean;
  licenciaWindows: boolean;
  mantenimientoReloj: boolean;
  rendimientoEquipo: boolean;
};

type ApiError = { error?: string };
type ApiListResp<T> = { items: T[] };

function isoLocalFromDateTimeLocal(dt: string) {
  if (!dt) return new Date().toISOString();
  const d = new Date(dt.replace(" ", "T"));
  const tzOffset = d.getTimezoneOffset();
  const utcMs = d.getTime() - tzOffset * 60_000;
  return new Date(utcMs).toISOString();
}

async function apiPost<TResp>(url: string, body: unknown): Promise<TResp> {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as Partial<ApiError>;
      if (j?.error) msg = j.error;
    } catch { /* no-op */ }
    throw new Error(msg);
  }
  try { return (await res.json()) as TResp; } catch { return undefined as unknown as TResp; }
}

async function apiPatch<TResp>(url: string, body: unknown): Promise<TResp> {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as Partial<ApiError>;
      if (j?.error) msg = j.error;
    } catch { /* no-op */ }
    throw new Error(msg);
  }
  try { return (await res.json()) as TResp; } catch { return undefined as unknown as TResp; }
}

async function apiGet<TResp>(url: string, signal?: AbortSignal): Promise<TResp> {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as Partial<ApiError>;
      if (j?.error) msg = j.error;
    } catch { /* no-op */ }
    throw new Error(msg);
  }
  return (await res.json()) as TResp;
}

export default function CreateVisitaModal({
  open,
  onClose,
  onCreated,
  onUpdated,
  tecnicos,
  empresas,
  mode = "create",
  visita,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  onUpdated?: () => void;
  tecnicos: TecnicoMini[];
  empresas: EmpresaMini[];
  mode?: "create" | "edit";
  visita?: VisitaForEdit;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [empresaId, setEmpresaId] = useState<number | "">("");
  const [tecnicoId, setTecnicoId] = useState<number | "">("");

  // === Selección múltiples solicitantes (create) ===
  const [selectedSolicitantes, setSelectedSolicitantes] = useState<Array<{ id?: number; nombre: string }>>([]);
  const [manualNombre, setManualNombre] = useState("");

  // === Modo edición: mantiene campos originales (uno) ===
  const [solicitanteId, setSolicitanteId] = useState<number | "">("");
  const [solicitante, setSolicitante] = useState("");

  // listado + búsqueda
  const [solLoading, setSolLoading] = useState(false);
  const [solError, setSolError] = useState<string | null>(null);
  const [solicitantes, setSolicitantes] = useState<SolicitanteMini[]>([]);
  const [solSearch, setSolSearch] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const solicitantesAbortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  const nowLocal = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => `${n}`.padStart(2, "0");
    const y = d.getFullYear(), m = pad(d.getMonth() + 1), da = pad(d.getDate()), h = pad(d.getHours()), mi = pad(d.getMinutes());
    return `${y}-${m}-${da}T${h}:${mi}`;
  }, []);

  const [inicio, setInicio] = useState(nowLocal);
  const [fin, setFin] = useState<string>("");
  const [status, setStatus] = useState<EstadoVisita>("PENDIENTE");

  const [confImpresoras, setConfImpresoras] = useState(false);
  const [confTelefonos, setConfTelefonos] = useState(false);
  const [confPiePagina, setConfPiePagina] = useState(false);
  const [otros, setOtros] = useState(false);
  const [otrosDetalle, setOtrosDetalle] = useState("");

  const [actualizaciones, setActualizaciones] = useState(false);
  const [antivirus, setAntivirus] = useState(false);
  const [ccleaner, setCcleaner] = useState(false);
  const [estadoDisco, setEstadoDisco] = useState(false);
  const [licenciaOffice, setLicenciaOffice] = useState(false);
  const [licenciaWindows, setLicenciaWindows] = useState(false);
  const [mantenimientoReloj, setMantenimientoReloj] = useState(false);
  const [rendimientoEquipo, setRendimientoEquipo] = useState(false);

  // reset / prefill
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && visita) {
      setSubmitting(false); setError(null);
      setEmpresaId(visita.empresaId);
      setTecnicoId(visita.tecnicoId);
      setSolicitanteId(visita.solicitanteId ?? "");
      setSolicitante(visita.solicitante ?? "");
      setInicio(toLocalDT(visita.inicio));
      setFin(visita.fin ? toLocalDT(visita.fin) : "");
      setStatus(visita.status);
      setConfImpresoras(visita.confImpresoras);
      setConfTelefonos(visita.confTelefonos);
      setConfPiePagina(visita.confPiePagina);
      setOtros(visita.otros);
      setOtrosDetalle(visita.otrosDetalle ?? "");
      setActualizaciones(visita.actualizaciones);
      setAntivirus(visita.antivirus);
      setCcleaner(visita.ccleaner);
      setEstadoDisco(visita.estadoDisco);
      setLicenciaOffice(visita.licenciaOffice);
      setLicenciaWindows(visita.licenciaWindows);
      setMantenimientoReloj(visita.mantenimientoReloj);
      setRendimientoEquipo(visita.rendimientoEquipo);

      // limpiar estados de lote
      setSelectedSolicitantes([]);
      setManualNombre("");

      setSolSearch("");
      setSolError(null);
      setSolLoading(false);
      setTimeout(() => searchRef.current?.focus(), 10);
    } else {
      // create
      setSubmitting(false); setError(null);
      setEmpresaId(""); setTecnicoId("");
      setSolicitanteId(""); setSolicitante("");
      setSelectedSolicitantes([]);
      setManualNombre("");
      setInicio(nowLocal); setFin(""); setStatus("PENDIENTE");
      setConfImpresoras(false); setConfTelefonos(false); setConfPiePagina(false);
      setOtros(false); setOtrosDetalle("");
      setActualizaciones(false); setAntivirus(false); setCcleaner(false);
      setEstadoDisco(false); setLicenciaOffice(false); setLicenciaWindows(false);
      setMantenimientoReloj(false); setRendimientoEquipo(false);
      setSolicitantes([]); setSolSearch(""); setSolError(null); setSolLoading(false);
      setTimeout(() => searchRef.current?.focus(), 10);
    }
  }, [open, nowLocal, mode, visita]);

  /** Limpiar selección cuando cambia empresa (solo create) */
  useEffect(() => {
    if (mode === "create") {
      setSolicitanteId("");
      setSolicitante("");
      setSelectedSolicitantes([]);
      setManualNombre("");
      setSolSearch("");
      setSolicitantes([]);
    }
  }, [empresaId, mode]);

  /** Traer solicitantes (empresa + q) con cancelación + debounce */
  useEffect(() => {
    const empresaElegida = typeof empresaId === "number" && empresaId > 0;

    solicitantesAbortRef.current?.abort();

    if (!empresaElegida) {
      setSolicitantes([]);
      return;
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const ctrl = new AbortController();
      solicitantesAbortRef.current = ctrl;
      setSolLoading(true); setSolError(null);
      try {
        const url = new URL(`${API_URL}/solicitantes/by-empresa`);
        url.searchParams.set("empresaId", String(empresaId));
        if (solSearch.trim()) url.searchParams.set("q", solSearch.trim());
        const data = await apiGet<ApiListResp<{ id: number; nombre: string }>>(url.toString(), ctrl.signal);
        const list = data.items ?? [];
        setSolicitantes(list);

        // En edición, refresca nombre si aplica
        if (mode === "edit" && visita && typeof solicitanteId === "number" && solicitanteId > 0) {
          const found = list.find(s => s.id === solicitanteId);
          if (found) setSolicitante(found.nombre);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setSolError(e instanceof Error ? e.message : "No se pudieron cargar los solicitantes");
          setSolicitantes([]);
        }
      } finally {
        setSolLoading(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [empresaId, solSearch, mode, visita, solicitanteId]);

  // mantener el listbox arriba
  useEffect(() => {
    const el = selectRef.current;
    if (el) el.scrollTop = 0;
  }, [solicitantes.length]);

  // === Helpers selección múltiple (create) ===
  function addSolicitanteById(idStr: string) {
    if (!idStr) return;
    const id = Number(idStr);
    if (!Number.isFinite(id)) return;
    const found = solicitantes.find(s => s.id === id);
    if (!found) return;
    const exists = selectedSolicitantes.some(s => s.id === id);
    if (exists) return;
    setSelectedSolicitantes(prev => [...prev, { id, nombre: found.nombre }]);
  }

  function removeSolicitante(idx: number) {
    setSelectedSolicitantes(prev => prev.filter((_, i) => i !== idx));
  }

  function addManualNombre() {
    const n = manualNombre.trim();
    if (!n) return;
    const exists = selectedSolicitantes.some(s => !s.id && s.nombre.toLowerCase() === n.toLowerCase());
    if (exists) return;
    setSelectedSolicitantes(prev => [...prev, { nombre: n }]);
    setManualNombre("");
  }

  // Para edición (uno)
  function handleSelectSolicitanteSingle(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (!val) { setSolicitanteId(""); setSolicitante(""); return; }
    const idNum = Number(val);
    const found = solicitantes.find(s => s.id === idNum);
    setSolicitanteId(idNum);
    setSolicitante(found ? found.nombre : "");
  }

  const empresaElegida = typeof empresaId === "number" && empresaId > 0;
  const listOpenSize = empresaElegida ? Math.min(Math.max(solicitantes.length, 6), 10) : 1;

  const canSubmit =
    empresaElegida &&
    !!tecnicoId &&
    !!inicio &&
    (status === "PENDIENTE" || status === "COMPLETADA" || status === "CANCELADA") &&
    (
      (mode === "edit" && typeof solicitanteId === "number" && solicitanteId > 0 && solicitante.trim().length > 0)
      ||
      (mode === "create" && selectedSolicitantes.length > 0)
    );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    const base = {
      empresaId: Number(empresaId),
      tecnicoId: Number(tecnicoId),
      inicio: isoLocalFromDateTimeLocal(inicio),
      fin: fin ? isoLocalFromDateTimeLocal(fin) : null,
      status,
      confImpresoras, confTelefonos, confPiePagina,
      otros, otrosDetalle: otros ? (otrosDetalle.trim() || null) : null,
      actualizaciones, antivirus, ccleaner, estadoDisco,
      licenciaOffice, licenciaWindows, mantenimientoReloj, rendimientoEquipo,
    };

    try {
      setSubmitting(true); setError(null);

      if (mode === "edit" && visita) {
        // Modo UNO para edit
        const payload: CreateVisitaPayloadSingle = {
          ...base,
          solicitante: solicitante.trim(),
          solicitanteId: typeof solicitanteId === "number" ? solicitanteId : null,
        };
        await apiPatch<unknown>(`${API_URL}/visitas/${visita.id_visita}`, payload);
        onUpdated?.();
      } else {
        // Modo LOTE para create
        const ids = selectedSolicitantes.filter(s => typeof s.id === "number").map(s => s.id!) as number[];
        const names = selectedSolicitantes.filter(s => !s.id).map(s => s.nombre.trim()).filter(Boolean);

        const payload: CreateVisitaPayloadBatch = {
          ...base,
          ...(ids.length ? { solicitantesIds: ids } : {}),
          ...(names.length ? { solicitantesNombres: names } : {}),
        };

        await apiPost<unknown>(`${API_URL}/visitas`, payload);
        onCreated();
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar la visita";
      setError(msg); setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-3xl border border-cyan-100/60 bg-white/90 shadow-2xl shadow-cyan-200/30 ring-1 ring-cyan-100 animate-in fade-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit}>
          <header className="px-6 py-4 border-b border-cyan-100/60 bg-gradient-to-r from-cyan-50/60 to-white rounded-t-3xl">
            <h2 className="text-xl font-extrabold tracking-tight text-neutral-900">
              {mode === "edit" ? "Editar visita" : "Nueva visita"}
            </h2>
            <p className="text-xs text-neutral-500">
              {mode === "edit" ? "Modifica los datos y guarda para actualizar el registro." : "Completa los datos y guarda para crear el registro (puedes agregar varios solicitantes)."}
            </p>
          </header>

          <div className="p-6 space-y-6 md:max-h-[75vh] overflow-auto">
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/80 text-rose-800 px-3 py-2 text-sm animate-in fade-in duration-150">
                {error}
              </div>
            )}

            {/* Empresa / Técnico */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Empresa">
                <select
                  className="mt-1 w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600/30 focus:border-cyan-600/60 transition"
                  value={empresaId}
                  onChange={(e) => { setEmpresaId(e.target.value ? Number(e.target.value) : ""); setSolSearch(""); }}
                  required
                >
                  <option value="">{mode==="edit" ? "Cambiar…" : "Seleccione…"}</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </Field>

              <Field label="Técnico">
                <select
                  className="mt-1 w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600/30 focus:border-cyan-600/60 transition"
                  value={tecnicoId}
                  onChange={(e) => setTecnicoId(e.target.value ? Number(e.target.value) : "")}
                  required
                >
                  <option value="">{mode==="edit" ? "Cambiar…" : "Seleccione…"}</option>
                  {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </Field>
            </div>

            {/* Buscar + Select / Selección */}
            {mode === "edit" ? (
              // === UI de selección SINGLE (edición existente) ===
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field className="md:col-span-2" label="Buscar solicitante">
                  <div className="relative mt-1">
                    <input
                      ref={searchRef}
                      className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 pr-10 text-sm placeholder-neutral-400
                                 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600/60 transition"
                      placeholder={empresaElegida ? "Escribe para filtrar…" : "Seleccione primero una empresa"}
                      value={solSearch}
                      onChange={(e) => setSolSearch(e.target.value)}
                      disabled={!empresaElegida}
                    />
                    {solLoading && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Spinner className="w-4 h-4 text-emerald-600" />
                      </span>
                    )}
                  </div>
                </Field>

                <Field label="Solicitante">
                  <select
                    ref={selectRef}
                    className="mt-1 w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600/60 transition hover:bg-neutral-50"
                    value={solicitanteId === "" ? "" : String(solicitanteId)}
                    onChange={handleSelectSolicitanteSingle}
                    disabled={!empresaElegida}
                    required={empresaElegida}
                    size={listOpenSize}
                  >
                    {!empresaElegida ? (
                      <option value="">Seleccione empresa</option>
                    ) : solicitantes.length === 0 ? (
                      <option value="" disabled>{solLoading ? "Cargando…" : "Sin coincidencias"}</option>
                    ) : (
                      <>
                        <option value="">— Seleccione —</option>
                        {solicitantes.map(s => (
                          <option key={s.id} value={String(s.id)}>{s.nombre}</option>
                        ))}
                      </>
                    )}
                  </select>
                  {typeof solicitanteId === "number" && solicitante && (
                    <p className="mt-1 text-[11px] text-emerald-700">
                      Seleccionado: <strong>{solicitante}</strong>
                    </p>
                  )}
                  {solError && <p className="mt-1 text-[11px] text-rose-600">{solError}</p>}
                </Field>
              </div>
            ) : (
              // === UI de selección MÚLTIPLE (create) ===
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field className="md:col-span-2" label="Buscar solicitantes">
                    <div className="relative mt-1">
                      <input
                        ref={searchRef}
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 pr-10 text-sm placeholder-neutral-400
                                   focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600/60 transition"
                        placeholder={empresaElegida ? "Escribe para filtrar…" : "Seleccione primero una empresa"}
                        value={solSearch}
                        onChange={(e) => setSolSearch(e.target.value)}
                        disabled={!empresaElegida}
                      />
                      {solLoading && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Spinner className="w-4 h-4 text-emerald-600" />
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-500">Selecciona del listado de la derecha y se agregará a la lista.</p>
                  </Field>

                  <Field label="Resultados">
                    <select
                      ref={selectRef}
                      className="mt-1 w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600/60 transition hover:bg-neutral-50"
                      onChange={(e) => { addSolicitanteById(e.target.value); e.currentTarget.selectedIndex = 0; }}
                      disabled={!empresaElegida}
                      size={listOpenSize}
                    >
                      {!empresaElegida ? (
                        <option value="">Seleccione empresa</option>
                      ) : solicitantes.length === 0 ? (
                        <option value="" disabled>{solLoading ? "Cargando…" : "Sin coincidencias"}</option>
                      ) : (
                        <>
                          <option value="">— Agregar —</option>
                          {solicitantes.map(s => (
                            <option key={s.id} value={String(s.id)}>{s.nombre}</option>
                          ))}
                        </>
                      )}
                    </select>
                    {solError && <p className="mt-1 text-[11px] text-rose-600">{solError}</p>}
                  </Field>
                </div>

                {/* Agregar manual por nombre */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field className="md:col-span-2" label="Agregar por nombre (si no existe)">
                    <input
                      className="mt-1 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600/60 transition"
                      placeholder="Ej: Invitado RIDS"
                      value={manualNombre}
                      onChange={(e) => setManualNombre(e.target.value)}
                      disabled={!empresaElegida}
                    />
                  </Field>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={addManualNombre}
                      disabled={!empresaElegida || manualNombre.trim().length === 0}
                      className="w-full rounded-2xl px-4 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:bg-emerald-200"
                    >
                      Agregar nombre
                    </button>
                  </div>
                </div>

                {/* Seleccionados */}
                <div>
                  <div className="mb-1 text-sm font-medium text-neutral-700">Seleccionados</div>
                  {selectedSolicitantes.length === 0 ? (
                    <div className="text-[13px] text-neutral-500">No hay solicitantes agregados.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedSolicitantes.map((s, idx) => (
                        <button
                          key={`${s.id ?? "name"}:${s.nombre}:${idx}`}
                          type="button"
                          onClick={() => removeSolicitante(idx)}
                          className="group inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 hover:bg-emerald-100"
                          title="Quitar"
                        >
                          <span className="font-medium">{s.nombre}</span>
                          <span className="rounded-full bg-emerald-200 px-1.5 text-[11px] group-hover:bg-emerald-300">
                            ×
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fechas y estado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Inicio">
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600/30 focus:border-cyan-600/60 transition"
                  value={inicio} onChange={(e) => setInicio(e.target.value)} required
                />
              </Field>
              <Field label="Fin (opcional)">
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600/30 focus:border-cyan-600/60 transition"
                  value={fin} onChange={(e) => setFin(e.target.value)}
                />
              </Field>
              <Field label="Estado">
                <select
                  className="mt-1 w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600/30 focus:border-cyan-600/60 transition"
                  value={status} onChange={(e) => setStatus(e.target.value as EstadoVisita)} required
                >
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="COMPLETADA">COMPLETADA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
              </Field>
            </div>

            {/* Config rápida */}
            <fieldset className="rounded-2xl border border-neutral-200 p-4 bg-white/70">
              <legend className="text-sm font-semibold text-neutral-700 px-1">Configuración</legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
                <Check label="Impresoras" value={confImpresoras} onChange={setConfImpresoras} />
                <Check label="Teléfonos" value={confTelefonos} onChange={setConfTelefonos} />
                <Check label="Pie de página" value={confPiePagina} onChange={setConfPiePagina} />
                <label className="inline-flex items-center gap-2 col-span-1 md:col-span-3">
                  <input type="checkbox" checked={otros} onChange={(e) => setOtros(e.target.checked)} />
                  <span className="text-sm">Otros (detalle)</span>
                </label>
                <textarea
                  className="md:col-span-3 rounded-2xl border border-neutral-300 px-3 py-2"
                  rows={2} disabled={!otros} value={otrosDetalle}
                  onChange={(e) => setOtrosDetalle(e.target.value)} placeholder="Describe otros requerimientos…"
                />
              </div>
            </fieldset>

            {/* Checklist */}
            <fieldset className="rounded-2xl border border-neutral-200 p-4 bg-white/70">
              <legend className="text-sm font-semibold text-neutral-700 px-1">Checklist</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-1">
                <Check label="Actualizaciones" value={actualizaciones} onChange={setActualizaciones} />
                <Check label="Antivirus" value={antivirus} onChange={setAntivirus} />
                <Check label="CCleaner" value={ccleaner} onChange={setCcleaner} />
                <Check label="Estado disco" value={estadoDisco} onChange={setEstadoDisco} />
                <Check label="Licencia Office" value={licenciaOffice} onChange={setLicenciaOffice} />
                <Check label="Licencia Windows" value={licenciaWindows} onChange={setLicenciaWindows} />
                <Check label="Mant. reloj" value={mantenimientoReloj} onChange={setMantenimientoReloj} />
                <Check label="Rend. equipo" value={rendimientoEquipo} onChange={setRendimientoEquipo} />
              </div>
            </fieldset>
          </div>

          <footer className="px-6 py-4 border-t border-cyan-100/60 bg-white/80 rounded-b-3xl flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border px-4 py-2 text-sm border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm ${
                !canSubmit || submitting
                  ? "bg-emerald-200 text-white cursor-not-allowed"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200/50 transition"
              }`}
            >
              {submitting && <Spinner className="w-4 h-4 text-white" />}
              {submitting ? "Guardando…" : mode === "edit" ? "Actualizar visita" : "Crear visita(s)"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

/* UI helpers */
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  );
}

function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-neutral-50 transition">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className ?? ""}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function toLocalDT(d: string | Date) {
  const dt = new Date(d);
  const pad = (n: number) => `${n}`.padStart(2, "0");
  const y = dt.getFullYear(); const m = pad(dt.getMonth() + 1); const da = pad(dt.getDate());
  const h = pad(dt.getHours()); const mi = pad(dt.getMinutes());
  return `${y}-${m}-${da}T${h}:${mi}`;
}
