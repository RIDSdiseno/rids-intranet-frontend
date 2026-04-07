import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  closeMantencionRemota,
  createMantencionRemota,
  deleteMantencionRemota,
  getMantencionRemota,
  getMantencionesRemotasFilters,
  listMantencionesRemotas,
  updateMantencionRemota,
  type CreateMantencionResponse,
  type FiltersResp,
  type MantencionRemota,
  type MantencionRemotaUpsert,
  type MantencionStatus,
} from "../lib/mantencionesRemotasApi";
import { http } from "../service/http";

import MantencionUpsertModal from "../components/modal-mantenciones/MantencionUpsert";
import MantencionDetailsModal from "../components/modal-mantenciones/MantencionDetail";
import MantencionFiltersBar from "../components/modal-mantenciones/MantencionFiltersBar";
import MantencionMobileList from "../components/modal-mantenciones/MantencionMobileList";
import MantencionDesktopTable from "../components/modal-mantenciones/MantencionDesktopTable";
import MantencionesDashboardTab from "../components/modal-mantenciones/MantencionesDashboard";

type LoadState = "idle" | "loading" | "error";

const TABS = [
  { key: "mantenciones", label: "Mantenciones" },
  { key: "dashboard",    label: "Dashboard"    },
] as const;

type TabKey = typeof TABS[number]["key"];

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CL", {
      timeZone: "America/Santiago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      hourCycle: "h23",
    });
  } catch {
    return String(iso);
  }
}

function toDatetimeLocal(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS: MantencionStatus[] = ["EN_CURSO", "COMPLETADA"];

type JwtUserLike = {
  rol?: string;
  role?: string;
  empresaId?: unknown;
  empresa_id?: unknown;
  id_empresa?: unknown;
  tecnicoId?: unknown;
  tecnico_id?: unknown;
  id_tecnico?: unknown;
  trabajadorId?: unknown;
  trabajador_id?: unknown;
  id_trabajador?: unknown;
  email?: unknown;
  nombre?: unknown;
  name?: unknown;
};

type JwtPayload = JwtUserLike & {
  user?: JwtUserLike;
  usuario?: JwtUserLike;
  data?: JwtUserLike;
  profile?: JwtUserLike;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function toNumberOrNull(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toStringOrNull(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (v == null) return null;
  return String(v);
}

function getUserFromToken(): {
  rol?: string;
  empresaId?: number | null;
  tecnicoId?: number | null;
  email?: string | null;
  nombre?: string | null;
} {
  const raw =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    "";

  if (!raw) return {};

  const t = raw.startsWith("Bearer ") ? raw.slice(7).trim() : raw.trim();
  const payload = decodeJwtPayload(t);
  if (!payload) return {};

  const pUser =
    payload.user ?? payload.usuario ?? payload.data ?? payload.profile ?? undefined;

  const rolRaw = payload.rol ?? payload.role ?? pUser?.rol ?? pUser?.role ?? undefined;
  const rol = typeof rolRaw === "string" ? rolRaw : undefined;

  const empresaIdRaw =
    payload.empresaId ?? payload.empresa_id ??
    pUser?.empresaId ?? pUser?.empresa_id ?? pUser?.id_empresa ?? null;

  const tecnicoIdRaw =
    payload.tecnicoId ?? payload.tecnico_id ?? payload.id_tecnico ??
    payload.trabajadorId ?? payload.trabajador_id ??
    pUser?.tecnicoId ?? pUser?.tecnico_id ?? pUser?.id_tecnico ??
    pUser?.trabajadorId ?? pUser?.trabajador_id ?? pUser?.id_trabajador ?? null;

  const email = toStringOrNull(payload.email ?? pUser?.email ?? null);
  const nombre = toStringOrNull(payload.nombre ?? payload.name ?? pUser?.nombre ?? pUser?.name ?? null);
  const empresaId = toNumberOrNull(empresaIdRaw);
  const tecnicoId = toNumberOrNull(tecnicoIdRaw);

  return {
    rol,
    empresaId: empresaId && empresaId > 0 ? empresaId : null,
    tecnicoId: tecnicoId && tecnicoId > 0 ? tecnicoId : null,
    email,
    nombre,
  };
}

type IdOrEmpty = number | "";

type FormState = {
  empresaId: IdOrEmpty;
  tecnicoId: IdOrEmpty;
  fin: string;
  status: MantencionStatus;
  solicitanteId: IdOrEmpty;
  soporteRemoto: boolean;
  actualizaciones: boolean;
  antivirus: boolean;
  ccleaner: boolean;
  estadoDisco: boolean;
  licenciaOffice: boolean;
  licenciaWindows: boolean;
  optimizacion: boolean;
  respaldo: boolean;
  otros: boolean;
  otrosDetalle: string;
};

function defaultForm(): FormState {
  return {
    empresaId: "",
    tecnicoId: "",
    fin: "",
    status: "COMPLETADA",
    solicitanteId: "",
    soporteRemoto: true,
    actualizaciones: true,
    antivirus: true,
    ccleaner: true,
    estadoDisco: true,
    licenciaOffice: true,
    licenciaWindows: true,
    optimizacion: false,
    respaldo: false,
    otros: false,
    otrosDetalle: "",
  };
}

function parseNumberOrEmpty(v: string): IdOrEmpty {
  if (!v) return "";
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : "";
}

function parseStatusOrEmpty(v: string): MantencionStatus | "" {
  if (!v) return "";
  return STATUS.includes(v as MantencionStatus) ? (v as MantencionStatus) : "";
}

type SolicitanteOpt = { id: number; nombre: string };

type ApiListResp<T> = {
  items?: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

function normalizeSolicitantesPayload(raw: unknown): SolicitanteOpt[] {
  if (Array.isArray(raw)) return raw as SolicitanteOpt[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const items = obj["items"];
    if (Array.isArray(items)) return items as SolicitanteOpt[];
  }
  return [];
}

export default function MantencionesRemotasPage() {
  const user = useMemo(getUserFromToken, []);
  const isCliente = user.rol === "CLIENTE";

  const [filters, setFilters] = useState<FiltersResp | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [tecnicoId, setTecnicoId] = useState<IdOrEmpty>("");
  const [empresaId, setEmpresaId] = useState<IdOrEmpty>("");
  const [status, setStatus] = useState<MantencionStatus | "">("");
  const [month, setMonth] = useState<IdOrEmpty>("");
  const [year, setYear] = useState<IdOrEmpty>("");
  const [q, setQ] = useState("");

  const [state, setState] = useState<LoadState>("idle");
  const [err, setErr] = useState<string | null>(null);

  const [items, setItems] = useState<MantencionRemota[]>([]);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [upsertOpen, setUpsertOpen] = useState(false);
  const [editing, setEditing] = useState<MantencionRemota | null>(null);
  const [form, setForm] = useState<FormState>(() => defaultForm());
  const [saving, setSaving] = useState(false);

  const [solicitantes, setSolicitantes] = useState<SolicitanteOpt[]>([]);
  const [solState, setSolState] = useState<LoadState>("idle");
  const [solSearch, setSolSearch] = useState("");

  const solicitantesAbortRef = useRef<AbortController | null>(null);
  const solicitantesDebounceRef = useRef<number | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsState, setDetailsState] = useState<LoadState>("idle");
  const [detailsErr, setDetailsErr] = useState<string | null>(null);
  const [details, setDetails] = useState<MantencionRemota | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("mantenciones");

  useEffect(() => {
    let mounted = true;
    getMantencionesRemotasFilters()
      .then((r) => mounted && setFilters(r))
      .catch(() => mounted && setFilters({ tecnicos: [], empresas: [] }));
    return () => { mounted = false; };
  }, []);

  async function load() {
    setState("loading");
    setErr(null);
    try {
      const resp = await listMantencionesRemotas({
        page,
        pageSize,
        tecnicoId: tecnicoId === "" ? undefined : tecnicoId,
        empresaId: isCliente ? undefined : empresaId === "" ? undefined : empresaId,
        status: status === "" ? undefined : status,
        month: month === "" ? undefined : month,
        year: year === "" ? undefined : year,
        q,
      });
      setItems(resp.items ?? []);
      setTotal(resp.total ?? 0);
      setState("idle");
    } catch (e: unknown) {
      setState("error");
      setErr(e instanceof Error ? e.message : "Error cargando mantenciones");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, tecnicoId, empresaId, status, month, year, q]);

  function resetUpsertState() {
    setForm(defaultForm());
    setSolicitantes([]);
    setSolState("idle");
    setSolSearch("");
    setErr(null);
    setSaving(false);
    if (solicitantesDebounceRef.current) window.clearTimeout(solicitantesDebounceRef.current);
    if (solicitantesAbortRef.current) solicitantesAbortRef.current.abort();
    solicitantesAbortRef.current = null;
  }

  function clearAll() {
    setQ("");
    setTecnicoId("");
    setEmpresaId("");
    setStatus("");
    setMonth("");
    setYear("");
    setPage(1);
  }

  function loadSolicitantesByEmpresaDebounced(empId: number) {
    if (solicitantesDebounceRef.current) window.clearTimeout(solicitantesDebounceRef.current);
    if (solicitantesAbortRef.current) solicitantesAbortRef.current.abort();

    solicitantesDebounceRef.current = window.setTimeout(async () => {
      const ctrl = new AbortController();
      solicitantesAbortRef.current = ctrl;
      setSolState("loading");
      try {
        const { data } = await http.get<ApiListResp<SolicitanteOpt> | SolicitanteOpt[]>(
          "/solicitantes/by-empresa",
          {
            params: {
              empresaId: empId,
              q: solSearch.trim() ? solSearch.trim() : undefined,
              page: 1,
              pageSize: 100,
              _ts: Date.now(),
            },
            signal: ctrl.signal,
          }
        );
        const list = normalizeSolicitantesPayload(data);
        setSolicitantes(list);
        setSolState("idle");
        setForm((p) => {
          if (p.solicitanteId === "") return p;
          const exists = list.some((s) => s.id === Number(p.solicitanteId));
          return exists ? p : { ...p, solicitanteId: "" };
        });
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setSolicitantes([]);
        setSolState("error");
      }
    }, 220);
  }

  useEffect(() => {
    if (!upsertOpen) return;
    if (isCliente) {
      const emp = user.empresaId;
      if (emp && Number.isFinite(emp) && emp > 0) {
        loadSolicitantesByEmpresaDebounced(Number(emp));
      } else {
        setSolicitantes([]);
        setSolState("idle");
        setForm((p) => ({ ...p, solicitanteId: "" }));
      }
      return;
    }
    if (form.empresaId === "") {
      setSolicitantes([]);
      setSolState("idle");
      setForm((p) => ({ ...p, solicitanteId: "" }));
      return;
    }
    loadSolicitantesByEmpresaDebounced(Number(form.empresaId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upsertOpen, form.empresaId, solSearch, isCliente]);

  function openCreate() {
    setEditing(null);
    const tecnicoAuto = user.tecnicoId ?? null;
    const base = defaultForm();
    setForm({
      ...base,
      tecnicoId: tecnicoAuto && tecnicoAuto > 0 ? tecnicoAuto : "",
      empresaId: "",
    });
    setSolSearch("");
    setSolicitantes([]);
    setSolState("idle");
    setErr(null);
    setSaving(false);
    setUpsertOpen(true);
    if (isCliente && user.empresaId) {
      loadSolicitantesByEmpresaDebounced(Number(user.empresaId));
    }
  }

  function openEdit(row: MantencionRemota) {
    setEditing(row);
    setForm({
      ...defaultForm(),
      empresaId: row.empresaId,
      tecnicoId: row.tecnicoId,
      fin: toDatetimeLocal(row.fin),
      status: row.status,
      solicitanteId: row.solicitanteId ?? "",
      soporteRemoto: !!row.soporteRemoto,
      actualizaciones: !!row.actualizaciones,
      antivirus: !!row.antivirus,
      ccleaner: !!row.ccleaner,
      estadoDisco: !!row.estadoDisco,
      licenciaOffice: !!row.licenciaOffice,
      licenciaWindows: !!row.licenciaWindows,
      optimizacion: !!row.optimizacion,
      respaldo: !!row.respaldo,
      otros: !!row.otros,
      otrosDetalle: row.otrosDetalle ?? "",
    });
    setSolSearch("");
    setSolicitantes([]);
    setSolState("idle");
    setErr(null);
    setSaving(false);
    setUpsertOpen(true);
    loadSolicitantesByEmpresaDebounced(row.empresaId);
  }

  function closeUpsert() {
    if (saving) return;
    setUpsertOpen(false);
    resetUpsertState();
  }

  async function openDetails(row: MantencionRemota) {
    setDetailsOpen(true);
    setDetailsState("loading");
    setDetailsErr(null);
    setDetails(row);
    try {
      const full = await getMantencionRemota(row.id_mantencion);
      setDetails(full);
      setDetailsState("idle");
    } catch (e: unknown) {
      setDetailsState("error");
      setDetailsErr(e instanceof Error ? e.message : "No se pudo cargar el detalle");
    }
  }

  function closeDetails() {
    setDetailsOpen(false);
    setDetailsState("idle");
    setDetailsErr(null);
    setDetails(null);
  }

  type TecnicoPayload = { tecnicoId: number } | { tecnicoEmail: string };

  function resolveTecnicoForPayload(): TecnicoPayload {
    const fromForm = form.tecnicoId === "" ? null : Number(form.tecnicoId);
    const fromToken = user.tecnicoId ?? null;
    const tecnicoId =
      (Number.isFinite(fromForm) && fromForm !== null && fromForm > 0 ? fromForm : null) ??
      (Number.isFinite(fromToken) && fromToken !== null && fromToken > 0 ? fromToken : null);
    const email = (user.email ?? "").trim().toLowerCase();
    if (tecnicoId && tecnicoId > 0) return { tecnicoId };
    if (email) return { tecnicoEmail: email };
    throw new Error("No se pudo detectar el técnico (falta tecnicoId y tecnicoEmail).");
  }

  function buildCreatePayload(): MantencionRemotaUpsert {
    const empresaFinal = isCliente
      ? user.empresaId && user.empresaId > 0 ? user.empresaId : null
      : form.empresaId === "" ? null : Number(form.empresaId);
    if (!empresaFinal) throw new Error("No se pudo detectar la empresa.");
    if (form.solicitanteId === "") throw new Error("Debes seleccionar un solicitante.");
    const tecnico = resolveTecnicoForPayload();
    return {
      empresaId: empresaFinal,
      ...tecnico,
      inicio: new Date().toISOString(),
      fin: form.fin ? new Date(form.fin).toISOString() : null,
      status: form.status,
      solicitanteId: Number(form.solicitanteId),
      soporteRemoto: !!form.soporteRemoto,
      actualizaciones: !!form.actualizaciones,
      antivirus: !!form.antivirus,
      ccleaner: !!form.ccleaner,
      estadoDisco: !!form.estadoDisco,
      licenciaOffice: !!form.licenciaOffice,
      licenciaWindows: !!form.licenciaWindows,
      optimizacion: !!form.optimizacion,
      respaldo: !!form.respaldo,
      otros: !!form.otros,
      otrosDetalle: form.otros ? form.otrosDetalle.trim() || null : null,
    };
  }

  function buildPatchPayload(): MantencionRemotaUpsert {
    if (!isCliente && form.empresaId === "") throw new Error("Debes seleccionar una empresa.");
    if (form.solicitanteId === "") throw new Error("Debes seleccionar un solicitante.");
    const tecnico = resolveTecnicoForPayload();
    return {
      ...(isCliente ? {} : { empresaId: Number(form.empresaId) }),
      ...tecnico,
      solicitanteId: Number(form.solicitanteId),
      fin: form.fin ? new Date(form.fin).toISOString() : null,
      status: form.status,
      soporteRemoto: !!form.soporteRemoto,
      actualizaciones: !!form.actualizaciones,
      antivirus: !!form.antivirus,
      ccleaner: !!form.ccleaner,
      estadoDisco: !!form.estadoDisco,
      licenciaOffice: !!form.licenciaOffice,
      licenciaWindows: !!form.licenciaWindows,
      optimizacion: !!form.optimizacion,
      respaldo: !!form.respaldo,
      otros: !!form.otros,
      otrosDetalle: form.otros ? form.otrosDetalle.trim() || null : null,
    };
  }

  async function onSubmit(): Promise<CreateMantencionResponse | void> {
    if (saving) return;
    setErr(null);
    setSaving(true);
    try {
      if (!editing) {
        const payload = buildCreatePayload();
        const created = await createMantencionRemota(payload);
        setUpsertOpen(false);
        resetUpsertState();
        await load();
        return created;
      }
      const patch = buildPatchPayload();
      await updateMantencionRemota(editing.id_mantencion, patch);
      setUpsertOpen(false);
      resetUpsertState();
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function onCloseMantencion(id: number) {
    if (!confirm("¿Cerrar mantención y marcar como COMPLETADA?")) return;
    try {
      await closeMantencionRemota(id);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "No se pudo cerrar");
    }
  }

  async function onDeleteMantencion(id: number) {
    if (!confirm("¿Eliminar mantención?")) return;
    try {
      await deleteMantencionRemota(id);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-white via-white to-cyan-50">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 [background:radial-gradient(circle_at_1px_1px,rgba(14,165,233,0.08)_1px,transparent_0)_0_0/22px_22px]" />
        <div className="absolute -top-32 -left-32 w-[60vw] max-w-[520px] aspect-square rounded-full blur-3xl bg-gradient-to-br from-cyan-200 to-indigo-200 opacity-40" />
        <div className="absolute -bottom-40 -right-40 w-[65vw] max-w-[560px] aspect-square rounded-full blur-3xl bg-gradient-to-tr from-fuchsia-200 to-cyan-200 opacity-40" />
      </div>

      {/* ── Tabs ── */}
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 pt-4 max-w-7xl mx-auto w-full">
        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-white border border-gray-200 text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "mantenciones" && (
        <MantencionFiltersBar
          q={q}
          setQ={setQ}
          tecnicoId={tecnicoId}
          setTecnicoId={setTecnicoId}
          empresaId={empresaId}
          setEmpresaId={setEmpresaId}
          status={status}
          setStatus={setStatus}
          month={month}
          setMonth={setMonth}
          year={year}
          setYear={setYear}
          filters={filters}
          isCliente={isCliente}
          STATUS={STATUS}
          parseNumberOrEmpty={parseNumberOrEmpty}
          parseStatusOrEmpty={parseStatusOrEmpty}
          clearAll={clearAll}
          onReload={() => void load()}
          onOpenCreate={openCreate}
          setPage={setPage}
        />
      )}

      <main className="px-3 sm:px-4 md:px-6 lg:px-8 pb-24 md:pb-10 max-w-7xl mx-auto w-full">
        {activeTab === "mantenciones" ? (
          <>
            <MantencionMobileList
              state={state}
              err={err}
              items={items}
              formatDateTime={formatDateTime}
              onOpenDetails={(row) => void openDetails(row)}
              onOpenEdit={openEdit}
              onCloseMantencion={(id) => void onCloseMantencion(id)}
              onDeleteMantencion={(id) => void onDeleteMantencion(id)}
            />
            <MantencionDesktopTable
              state={state}
              err={err}
              items={items}
              total={total}
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              setPage={setPage}
              setPageSize={setPageSize}
              formatDateTime={formatDateTime}
              onOpenDetails={(row) => void openDetails(row)}
              onOpenEdit={openEdit}
              onCloseMantencion={(id) => void onCloseMantencion(id)}
              onDeleteMantencion={(id) => void onDeleteMantencion(id)}
            />
          </>
        ) : (
          <MantencionesDashboardTab active={activeTab === "dashboard"} />
        )}
      </main>

      <MantencionUpsertModal
        open={upsertOpen}
        saving={saving}
        isCliente={isCliente}
        user={user}
        filters={filters}
        editing={editing}
        form={form}
        setForm={setForm}
        err={err}
        solState={solState}
        solicitantes={solicitantes}
        solSearch={solSearch}
        setSolSearch={setSolSearch}
        onClose={closeUpsert}
        onSubmit={() => void onSubmit()}
      />

      <MantencionDetailsModal
        open={detailsOpen}
        state={detailsState}
        err={detailsErr}
        details={details}
        onClose={closeDetails}
        onEdit={(row) => {
          closeDetails();
          openEdit(row);
        }}
      />
    </div>
  );
}