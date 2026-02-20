// src/pages/MantencionesRemotasPage.tsx
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

type LoadState = "idle" | "loading" | "error";

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago" });
  } catch {
    return String(iso);
  }
}

function StatusBadge({ status }: { status: MantencionStatus | string }) {
  const norm = (status || "").toUpperCase();
  const styles: Record<string, string> = {
    COMPLETADA: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  };
  const klass = styles[norm] || "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  return (
    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide", klass)}>
      {status}
    </span>
  );
}

/** ✅ Estados disponibles en UI */
const STATUS: MantencionStatus[] = ["COMPLETADA"];

/** ✅ Keys checklist tipadas (sin any) */
type ChecklistKey = keyof Pick<
  MantencionRemota,
  | "soporteRemoto"
  | "actualizaciones"
  | "antivirus"
  | "ccleaner"
  | "estadoDisco"
  | "licenciaOffice"
  | "licenciaWindows"
  | "optimizacion"
  | "respaldo"
>;

/**
 * ✅ Checklist (SIN 'otros' aquí)
 * "Otros" se renderiza aparte porque activa textarea.
 */
const FLAGS: Array<{ key: ChecklistKey; label: string }> = [
  { key: "soporteRemoto", label: "Soporte remoto" },
  { key: "actualizaciones", label: "Actualizaciones" },
  { key: "antivirus", label: "Antivirus" },
  { key: "ccleaner", label: "CCleaner" },
  { key: "estadoDisco", label: "Estado disco" },
  { key: "licenciaOffice", label: "Licencia Office" },
  { key: "licenciaWindows", label: "Licencia Windows" },
  { key: "optimizacion", label: "Optimización" },
  { key: "respaldo", label: "Respaldo" },
];

/* ================= JWT helpers (base64url-safe) ================= */

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

  const pUser = payload.user ?? payload.usuario ?? payload.data ?? payload.profile ?? undefined;

  const rolRaw = payload.rol ?? payload.role ?? pUser?.rol ?? pUser?.role ?? undefined;
  const rol = typeof rolRaw === "string" ? rolRaw : undefined;

  const empresaIdRaw =
    payload.empresaId ?? payload.empresa_id ?? pUser?.empresaId ?? pUser?.empresa_id ?? pUser?.id_empresa ?? null;

  const tecnicoIdRaw =
    payload.tecnicoId ??
    payload.tecnico_id ??
    payload.id_tecnico ??
    payload.trabajadorId ??
    payload.trabajador_id ??
    pUser?.tecnicoId ??
    pUser?.tecnico_id ??
    pUser?.id_tecnico ??
    pUser?.trabajadorId ??
    pUser?.trabajador_id ??
    pUser?.id_trabajador ??
    null;

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

/* ================= Types + helpers ================= */

type IdOrEmpty = number | "";

type FormState = {
  empresaId: IdOrEmpty;
  tecnicoId: IdOrEmpty;

  fin: string; // opcional
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

function boolLabel(v?: boolean | null) {
  return v ? "Sí" : "No";
}

/* ================= Page ================= */

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

  // Modal Crear/Editar (separado)
  const [upsertOpen, setUpsertOpen] = useState(false);
  const [editing, setEditing] = useState<MantencionRemota | null>(null);
  const [form, setForm] = useState<FormState>(() => defaultForm());
  const [saving, setSaving] = useState(false); // ✅ bloquea y muestra spinner al crear/guardar

  // solicitantes por empresa (modal upsert)
  const [solicitantes, setSolicitantes] = useState<SolicitanteOpt[]>([]);
  const [solState, setSolState] = useState<LoadState>("idle");
  const [solSearch, setSolSearch] = useState("");

  const solicitantesAbortRef = useRef<AbortController | null>(null);
  const solicitantesDebounceRef = useRef<number | null>(null);

  // Modal Detalles (separado)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsState, setDetailsState] = useState<LoadState>("idle");
  const [detailsErr, setDetailsErr] = useState<string | null>(null);
  const [details, setDetails] = useState<MantencionRemota | null>(null);

  /* ============ Filters (tecnicos/empresas) ============ */
  useEffect(() => {
    let mounted = true;
    getMantencionesRemotasFilters()
      .then((r) => mounted && setFilters(r))
      .catch(() => mounted && setFilters({ tecnicos: [], empresas: [] }));
    return () => {
      mounted = false;
    };
  }, []);

  /* ============ List ============ */
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

  /* ============ Solicitantes (debounce + abort) ============ */
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

  /* ============ Open/Close Upsert modal ============ */
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

      fin: row.fin ? new Date(row.fin).toISOString().slice(0, 16) : "",
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
    if (saving) return; // ✅ no cerrar mientras guarda
    setUpsertOpen(false);
    resetUpsertState();
  }

  /* ============ Detalles modal ============ */
  async function openDetails(row: MantencionRemota) {
    setDetailsOpen(true);
    setDetailsState("loading");
    setDetailsErr(null);

    // pinta algo altiro
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

  /* ============ Payloads ============ */

  type TecnicoPayload = { tecnicoId: number } | { tecnicoEmail: string };

  function resolveTecnicoForPayload(): TecnicoPayload {
    const fromForm = form.tecnicoId === "" ? null : Number(form.tecnicoId);
    const fromToken = user.tecnicoId ?? null;

    const tecnicoId =
      (Number.isFinite(fromForm) && fromForm !== null && fromForm > 0 ? fromForm : null) ??
      (Number.isFinite(fromToken) && fromToken !== null && fromToken > 0 ? fromToken : null);

    // si no hay tecnicoId, usamos email
    const email = (user.email ?? "").trim().toLowerCase();

    if (tecnicoId && tecnicoId > 0) return { tecnicoId };
    if (email) return { tecnicoEmail: email };

    throw new Error("No se pudo detectar el técnico (falta tecnicoId y tecnicoEmail).");
  }

  function buildCreatePayload(): MantencionRemotaUpsert {
    const empresaFinal = isCliente
      ? user.empresaId && user.empresaId > 0
        ? user.empresaId
        : null
      : form.empresaId === ""
      ? null
      : Number(form.empresaId);

    if (!empresaFinal) throw new Error("No se pudo detectar la empresa.");
    if (form.solicitanteId === "") throw new Error("Debes seleccionar un solicitante.");

    const tecnico = resolveTecnicoForPayload();

    return {
      empresaId: empresaFinal,
      ...tecnico, // tecnicoId o tecnicoEmail

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
      otrosDetalle: form.otros ? (form.otrosDetalle.trim() || null) : null,
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
      ccleaner: !!form.ccleaner, // ✅ typo original conservado en tu input; corrígelo a ccleaner abajo
      estadoDisco: !!form.estadoDisco,
      licenciaOffice: !!form.licenciaOffice,
      licenciaWindows: !!form.licenciaWindows,
      optimizacion: !!form.optimizacion,
      respaldo: !!form.respaldo,

      otros: !!form.otros,
      otrosDetalle: form.otros ? (form.otrosDetalle.trim() || null) : null,
    };
  }

  async function onSubmit(): Promise<CreateMantencionResponse | void> {
    if (saving) return; // ✅ evita doble click
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

      // ⚠️ corrige typo del patch: form.cccleaner -> form.ccleaner
      const patchRaw = buildPatchPayload();
      const patch =
        "cccleaner" in (patchRaw as Record<string, unknown>)
          ? ({
              ...patchRaw,
              ccleaner: (patchRaw as Record<string, unknown>)["cccleaner"],
            } as MantencionRemotaUpsert)
          : patchRaw;

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
      {/* Fondo */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 [background:radial-gradient(circle_at_1px_1px,rgba(14,165,233,0.08)_1px,transparent_0)_0_0/22px_22px]" />
        <div className="absolute -top-32 -left-32 w-[60vw] max-w-[520px] aspect-square rounded-full blur-3xl bg-gradient-to-br from-cyan-200 to-indigo-200 opacity-40" />
        <div className="absolute -bottom-40 -right-40 w-[65vw] max-w-[560px] aspect-square rounded-full blur-3xl bg-gradient-to-tr from-fuchsia-200 to-cyan-200 opacity-40" />
      </div>

      {/* Hero / Toolbar */}
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 max-w-7xl mx-auto w-full">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-cyan-200 bg-white/80 backdrop-blur-xl shadow-sm">
          <div className="absolute inset-0 opacity-60 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(14,165,233,0.06),transparent_30%,rgba(99,102,241,0.06),transparent_60%,rgba(236,72,153,0.06),transparent_90%)]" />
          <div className="relative p-4 sm:p-6 md:p-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
              Mantenciones{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">
                Remotas
              </span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Filtra por técnico, empresa, mes/año o búsqueda libre. Crea, edita, cierra o elimina.
            </p>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Buscar */}
              <div className="md:col-span-4">
                <input
                  value={q}
                  onChange={(e) => {
                    setPage(1);
                    setQ(e.target.value);
                  }}
                  placeholder="Buscar (solicitante, empresa, técnico, otros)…"
                  className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400"
                />
              </div>

              {/* Técnico (filtro listado) */}
              <div className="md:col-span-3">
                <select
                  value={tecnicoId}
                  onChange={(e) => {
                    setPage(1);
                    setTecnicoId(parseNumberOrEmpty(e.target.value));
                  }}
                  className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                >
                  <option value="">Todos los técnicos</option>
                  {filters?.tecnicos?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Empresa */}
              {!isCliente && (
                <div className="md:col-span-3">
                  <select
                    value={empresaId}
                    onChange={(e) => {
                      setPage(1);
                      setEmpresaId(parseNumberOrEmpty(e.target.value));
                    }}
                    className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  >
                    <option value="">Todas las empresas</option>
                    {filters?.empresas?.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Estado */}
              <div className={clsx("md:col-span-2", isCliente ? "md:col-span-3" : "")}>
                <select
                  value={status}
                  onChange={(e) => {
                    setPage(1);
                    setStatus(parseStatusOrEmpty(e.target.value));
                  }}
                  className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                >
                  <option value="">Estado (todos)</option>
                  {STATUS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mes / Año */}
              <div className="md:col-span-2">
                <input
                  value={month}
                  onChange={(e) => {
                    setPage(1);
                    setMonth(parseNumberOrEmpty(e.target.value));
                  }}
                  placeholder="Mes (1-12)"
                  className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                />
              </div>
              <div className="md:col-span-2">
                <input
                  value={year}
                  onChange={(e) => {
                    setPage(1);
                    setYear(parseNumberOrEmpty(e.target.value));
                  }}
                  placeholder="Año (2026)"
                  className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                />
              </div>

              {/* Acciones */}
              <div className="md:col-span-12">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={clearAll}
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-cyan-800 hover:bg-cyan-50 active:scale-[0.98] transition"
                  >
                    Limpiar
                  </button>

                  <button
                    onClick={() => void load()}
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-cyan-800 hover:bg-cyan-50 active:scale-[0.98] transition"
                  >
                    Recargar
                  </button>

                  <button
                    onClick={openCreate}
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl px-3 py-2.5 text-sm font-medium text-white bg-gradient-to-tr from-emerald-600 to-cyan-600 shadow-[0_6px_18px_-6px_rgba(16,185,129,0.45)] hover:brightness-110 active:scale-[0.98] transition"
                  >
                    + Nueva
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
          </div>
        </div>
      </div>

      {/* Lista */}
      <main className="px-3 sm:px-4 md:px-6 lg:px-8 pb-24 md:pb-10 max-w-7xl mx-auto w-full">
        {/* Cards Mobile */}
        <section
          className="md:hidden space-y-3 mt-4"
          aria-live="polite"
          aria-busy={state === "loading" ? "true" : "false"}
        >
          {state === "loading" && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`skm-${i}`} className="rounded-2xl border border-cyan-200 bg-white p-4 animate-pulse">
                  <div className="h-4 w-28 bg-cyan-50 rounded mb-2" />
                  <div className="h-3 w-4/5 bg-cyan-50 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-cyan-50 rounded" />
                </div>
              ))}
            </div>
          )}

          {state === "error" && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 p-4 text-center">
              {err}
            </div>
          )}

          {state === "idle" && items.length === 0 && (
            <div className="rounded-2xl border border-cyan-200 bg-white text-slate-600 p-4 text-center">
              Sin resultados.
            </div>
          )}

          {state === "idle" &&
            items.map((r) => {
              const empresa = r.empresa?.nombre ?? `#${r.empresaId}`;
              const tecnico = r.tecnico?.nombre ?? `#${r.tecnicoId}`;
              const solicitante = r.solicitante ?? "—";

              return (
                <article
                  key={r.id_mantencion}
                  className="rounded-2xl border border-cyan-200 bg-white p-4 transition hover:shadow-md"
                >
                  <header className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500">#{r.id_mantencion}</div>
                      <h3 className="text-base font-semibold text-slate-900">{empresa}</h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {tecnico} • {formatDateTime(r.inicio)}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </header>

                  <p className="text-sm text-slate-700 mt-2">
                    <span className="text-slate-500">Solicitante:</span> {solicitante}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => void openDetails(r)}
                      className="rounded-xl border border-indigo-200 text-indigo-700 px-2 py-2 text-sm hover:bg-indigo-50"
                    >
                      Detalles
                    </button>
                    <button
                      onClick={() => openEdit(r)}
                      className="rounded-xl border border-emerald-200 text-emerald-700 px-2 py-2 text-sm hover:bg-emerald-50"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => void onCloseMantencion(r.id_mantencion)}
                      disabled={r.status === "COMPLETADA"}
                      className={clsx(
                        "rounded-xl border px-2 py-2 text-sm transition",
                        r.status === "COMPLETADA"
                          ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                          : "border-cyan-200 text-cyan-800 hover:bg-cyan-50"
                      )}
                    >
                      Cerrar
                    </button>

                    <button
                      onClick={() => void onDeleteMantencion(r.id_mantencion)}
                      className="rounded-xl border border-rose-200 text-rose-700 px-2 py-2 text-sm hover:bg-rose-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              );
            })}
        </section>

        {/* Tabla Desktop */}
        <section className="hidden md:block rounded-3xl border border-cyan-200 bg-white overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-cyan-50 to-indigo-50 text-slate-800 border-b border-cyan-200 sticky top-0 z-10">
                <tr>
                  {["ID", "Técnico", "Empresa", "Solicitante", "Inicio", "Estado", "Acciones"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="text-slate-800">
                {state === "loading" && <TableSkeletonRows cols={7} rows={8} />}

                {state === "error" && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-rose-700">
                      {err}
                    </td>
                  </tr>
                )}

                {state === "idle" && items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-600">
                      Sin resultados.
                    </td>
                  </tr>
                )}

                {state === "idle" &&
                  items.map((r) => {
                    const empresa = r.empresa?.nombre ?? `#${r.empresaId}`;
                    const tecnico = r.tecnico?.nombre ?? `#${r.tecnicoId}`;
                    const solicitante = r.solicitante ?? "—";

                    return (
                      <tr
                        key={r.id_mantencion}
                        className="border-t border-cyan-100 transition-colors odd:bg-white even:bg-slate-50/40 hover:bg-cyan-50/60"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">{r.id_mantencion}</td>
                        <td className="px-4 py-3">{tecnico}</td>
                        <td className="px-4 py-3">{empresa}</td>
                        <td className="px-4 py-3">
                          <div className="max-w-[420px] truncate" title={solicitante}>
                            {solicitante}
                          </div>
                        </td>
                        <td className="px-4 py-3">{formatDateTime(r.inicio)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => void openDetails(r)}
                              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 text-indigo-700 px-2 py-1 hover:bg-indigo-50 transition"
                            >
                              Detalles
                            </button>
                            <button
                              onClick={() => openEdit(r)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 text-emerald-700 px-2 py-1 hover:bg-emerald-50 transition"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => void onCloseMantencion(r.id_mantencion)}
                              disabled={r.status === "COMPLETADA"}
                              className={clsx(
                                "inline-flex items-center gap-1 rounded-lg border px-2 py-1 transition",
                                r.status === "COMPLETADA"
                                  ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                                  : "border-cyan-200 text-cyan-800 hover:bg-cyan-50"
                              )}
                            >
                              Cerrar
                            </button>
                            <button
                              onClick={() => void onDeleteMantencion(r.id_mantencion)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 text-rose-700 px-2 py-1 hover:bg-rose-50 transition"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Footer paginación */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-slate-50 border-t border-cyan-200">
            <div className="text-sm text-slate-700 text-center sm:text-left">
              Total <strong className="text-slate-900">{total}</strong> • Página{" "}
              <strong className="text-slate-900">{page}</strong> de{" "}
              <strong className="text-slate-900">{totalPages}</strong>
            </div>

            <div className="grid grid-cols-3 sm:flex sm:items-center gap-2">
              <button
                onClick={() => page > 1 && setPage((p) => p - 1)}
                disabled={page <= 1 || state === "loading"}
                className={clsx(
                  "inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-sm",
                  "border-cyan-200 text-cyan-800 bg-white hover:bg-cyan-50",
                  (page <= 1 || state === "loading") && "opacity-40 cursor-not-allowed hover:bg-white"
                )}
                type="button"
              >
                Anterior
              </button>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPage(1);
                  setPageSize(Number(e.target.value));
                }}
                className="rounded-2xl border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}/página
                  </option>
                ))}
              </select>

              <button
                onClick={() => page < totalPages && setPage((p) => p + 1)}
                disabled={page >= totalPages || state === "loading"}
                className={clsx(
                  "inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-sm",
                  "border-cyan-200 text-cyan-800 bg-white hover:bg-cyan-50",
                  (page >= totalPages || state === "loading") && "opacity-40 cursor-not-allowed hover:bg-white"
                )}
                type="button"
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ✅ Modal Crear/Editar (separado como componente) */}
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

      {/* ✅ Modal Detalles (separado como componente) */}
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

/* ================= Components (modales separados) ================= */

function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "inline-block h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin",
        className
      )}
      aria-hidden="true"
    />
  );
}

function MantencionUpsertModal(props: {
  open: boolean;
  saving: boolean;

  isCliente: boolean;
  user: ReturnType<typeof getUserFromToken>;
  filters: FiltersResp | null;

  editing: MantencionRemota | null;

  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;

  err: string | null;

  solState: LoadState;
  solicitantes: SolicitanteOpt[];
  solSearch: string;
  setSolSearch: (v: string) => void;

  onClose: () => void;
  onSubmit: () => void;
}) {
  const {
    open,
    saving,
    isCliente,
    user,
    filters,
    editing,
    form,
    setForm,
    err,
    solState,
    solicitantes,
    solSearch,
    setSolSearch,
    onClose,
    onSubmit,
  } = props;

  if (!open) return null;

  const canClose = !saving;

  return (
    <div
      className={clsx("fixed inset-0 z-50 grid place-items-center p-4 bg-black/40", saving && "cursor-wait")}
      onClick={() => {
        if (!canClose) return; // ✅ bloquea cierre por overlay
        onClose();
      }}
    >
      <div
        className={clsx(
          "w-full max-w-4xl rounded-3xl border border-cyan-200 bg-white shadow-xl overflow-hidden",
          saving && "opacity-95"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-cyan-200 bg-gradient-to-r from-cyan-50 to-indigo-50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{editing ? "Editar mantención" : "Nueva mantención"}</h3>

          <button
            onClick={() => {
              if (!canClose) return;
              onClose();
            }}
            disabled={!canClose}
            className={clsx(
              "rounded-xl border border-cyan-200 bg-white px-3 py-1.5 text-sm text-cyan-800 hover:bg-cyan-50",
              !canClose && "opacity-50 cursor-not-allowed"
            )}
          >
            Cerrar
          </button>
        </div>

        <div className={clsx("p-5", saving && "pointer-events-none select-none")}>
          {/* ✅ Bloqueo real de inputs mientras guarda */}
          {err && (
            <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
              {err}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Empresa */}
            {!isCliente && (
              <div className="md:col-span-6">
                <label className="text-xs text-slate-600">Empresa</label>
                <select
                  value={form.empresaId === "" ? "" : String(form.empresaId)}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      empresaId: parseNumberOrEmpty(e.target.value),
                      solicitanteId: "",
                    }))
                  }
                  className="mt-1 w-full rounded-2xl border border-cyan-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">Selecciona empresa</option>
                  {filters?.empresas?.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Técnico automático */}
            <div className={clsx("md:col-span-6", isCliente && "md:col-span-12")}>
              <label className="text-xs text-slate-600">Técnico</label>
              <input
                value={
                  filters?.tecnicos?.find((t) => t.id === Number(form.tecnicoId))?.nombre ||
                  user.nombre ||
                  user.email ||
                  (form.tecnicoId ? `#${form.tecnicoId}` : "No detectado")
                }
                readOnly
                className="mt-1 w-full rounded-2xl border border-cyan-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
              />
            </div>

            {/* Fin */}
            <div className="md:col-span-6">
              <label className="text-xs text-slate-600">Fin (opcional)</label>
              <input
                type="datetime-local"
                value={form.fin}
                onChange={(e) => setForm((p) => ({ ...p, fin: e.target.value }))}
                className="mt-1 w-full rounded-2xl border border-cyan-200 bg-white px-3 py-2.5 text-sm"
              />
            </div>

            <div className="md:col-span-6">
              <label className="text-xs text-slate-600">Estado</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({ ...p, status: (e.target.value as MantencionStatus) || "PENDIENTE" }))
                }
                className="mt-1 w-full rounded-2xl border border-cyan-200 bg-white px-3 py-2.5 text-sm"
              >
                {STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Solicitante + búsqueda */}
            <div className="md:col-span-12">
              <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                <div className="flex-1">
                  <label className="text-xs text-slate-600">Solicitante</label>
                  <select
                    disabled={!isCliente && form.empresaId === ""}
                    value={form.solicitanteId === "" ? "" : String(form.solicitanteId)}
                    onChange={(e) => setForm((p) => ({ ...p, solicitanteId: parseNumberOrEmpty(e.target.value) }))}
                    className="mt-1 w-full rounded-2xl border border-cyan-200 bg-white px-3 py-2.5 text-sm disabled:opacity-50"
                  >
                    <option value="">
                      {!isCliente && form.empresaId === ""
                        ? "Primero selecciona empresa"
                        : solState === "loading"
                        ? "Cargando solicitantes..."
                        : "Selecciona solicitante"}
                    </option>

                    {solicitantes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>

                  {solState === "error" && <div className="mt-2 text-xs text-rose-700">No se pudieron cargar solicitantes.</div>}
                </div>

                <div className="sm:w-64">
                  <label className="text-xs text-slate-600">Buscar</label>
                  <input
                    value={solSearch}
                    onChange={(e) => setSolSearch(e.target.value)}
                    placeholder="Buscar solicitante…"
                    disabled={!isCliente && form.empresaId === ""}
                    className="mt-1 w-full rounded-2xl border border-cyan-200 bg-white px-3 py-2.5 text-sm disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="md:col-span-12">
              <div className="mt-2 rounded-2xl border border-cyan-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Checklist</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {FLAGS.map((f) => (
                    <label key={String(f.key)} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={!!form[f.key]}
                        onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.checked }))}
                        className="h-4 w-4"
                      />
                      {f.label}
                    </label>
                  ))}
                </div>

                {/* Otros + textarea */}
                <div className="mt-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={!!form.otros}
                      onChange={(e) => setForm((p) => ({ ...p, otros: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    Otros
                  </label>

                  {form.otros && (
                    <textarea
                      value={form.otrosDetalle}
                      onChange={(e) => setForm((p) => ({ ...p, otrosDetalle: e.target.value }))}
                      rows={3}
                      className="mt-2 w-full rounded-2xl border border-cyan-200 bg-white px-3 py-2.5 text-sm"
                      placeholder="Detalle otros..."
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer acciones */}
          <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-end">
            <button
              onClick={onClose}
              disabled={!canClose}
              className={clsx(
                "rounded-2xl border border-cyan-200 bg-white px-4 py-2 text-sm text-cyan-800 hover:bg-cyan-50",
                !canClose && "opacity-50 cursor-not-allowed"
              )}
            >
              Cancelar
            </button>

            <button
              onClick={onSubmit}
              disabled={saving}
              className={clsx(
                "rounded-2xl px-4 py-2 text-sm font-medium text-white bg-gradient-to-tr from-cyan-600 to-indigo-600 hover:brightness-110",
                saving && "opacity-90 cursor-wait"
              )}
            >
              <span className="inline-flex items-center gap-2">
                {saving && <Spinner />}
                {editing ? (saving ? "Guardando..." : "Guardar cambios") : saving ? "Creando..." : "Crear"}
              </span>
            </button>
          </div>
        </div>

        {/* ✅ capa visual de bloqueo (además del pointer-events-none) */}
        {saving && <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px]" aria-hidden="true" />}
      </div>
    </div>
  );
}

function MantencionDetailsModal(props: {
  open: boolean;
  state: LoadState;
  err: string | null;
  details: MantencionRemota | null;
  onClose: () => void;
  onEdit: (row: MantencionRemota) => void;
}) {
  const { open, state, err, details, onClose, onEdit } = props;
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-3xl border border-cyan-200 bg-white shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-cyan-200 bg-gradient-to-r from-indigo-50 to-cyan-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900">Detalles</h3>
            {details?.status && <StatusBadge status={details.status} />}
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-cyan-200 bg-white px-3 py-1.5 text-sm text-cyan-800 hover:bg-cyan-50"
          >
            Cerrar
          </button>
        </div>

        <div className="p-5">
          {state === "loading" && (
            <div className="rounded-2xl border border-cyan-200 bg-white p-4 animate-pulse">
              <div className="h-4 w-40 bg-cyan-50 rounded mb-3" />
              <div className="h-3 w-4/5 bg-cyan-50 rounded mb-2" />
              <div className="h-3 w-2/3 bg-cyan-50 rounded" />
            </div>
          )}

          {state === "error" && (
            <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
              {err ?? "No se pudo cargar el detalle."}
            </div>
          )}

          {details && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4 rounded-2xl border border-cyan-200 bg-white p-4">
                  <div className="text-xs text-slate-500">ID</div>
                  <div className="text-sm font-semibold text-slate-900">#{details.id_mantencion}</div>
                </div>

                <div className="md:col-span-4 rounded-2xl border border-cyan-200 bg-white p-4">
                  <div className="text-xs text-slate-500">Empresa</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {details.empresa?.nombre ?? `#${details.empresaId}`}
                  </div>
                </div>

                <div className="md:col-span-4 rounded-2xl border border-cyan-200 bg-white p-4">
                  <div className="text-xs text-slate-500">Técnico</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {details.tecnico?.nombre ?? `#${details.tecnicoId}`}
                  </div>
                </div>

                <div className="md:col-span-6 rounded-2xl border border-cyan-200 bg-white p-4">
                  <div className="text-xs text-slate-500">Solicitante</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {details.solicitanteRef?.nombre ?? details.solicitante ?? "—"}
                  </div>
                </div>

                <div className="md:col-span-3 rounded-2xl border border-cyan-200 bg-white p-4">
                  <div className="text-xs text-slate-500">Inicio</div>
                  <div className="text-sm font-semibold text-slate-900">{formatDateTime(details.inicio)}</div>
                </div>

                <div className="md:col-span-3 rounded-2xl border border-cyan-200 bg-white p-4">
                  <div className="text-xs text-slate-500">Fin</div>
                  <div className="text-sm font-semibold text-slate-900">{formatDateTime(details.fin)}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Checklist</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-slate-700">
                  {FLAGS.map((f) => {
                    const val = Boolean(details[f.key]);
                    return (
                      <div
                        key={String(f.key)}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <span>{f.label}</span>
                        <span
                          className={clsx(
                            "text-xs font-semibold px-2 py-0.5 rounded-full",
                            val
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                          )}
                        >
                          {boolLabel(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-700 font-medium">Otros</div>
                    <span
                      className={clsx(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        details.otros
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                      )}
                    >
                      {boolLabel(details.otros)}
                    </span>
                  </div>

                  {details.otros || (details.otrosDetalle?.trim() ?? "") ? (
                    <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                      {details.otrosDetalle?.trim() ? details.otrosDetalle : "—"}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                <button
                  onClick={() => onEdit(details)}
                  className="rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                >
                  Editar
                </button>
                <button
                  onClick={onClose}
                  className="rounded-2xl border border-cyan-200 bg-white px-4 py-2 text-sm text-cyan-800 hover:bg-cyan-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========= Skeleton ========= */
function TableSkeletonRows({ cols, rows = 8 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={`sk-${i}`} className="border-t border-slate-200">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={`sk-${i}-${j}`} className="px-4 py-3">
              <div className="h-4 w-full max-w-[260px] animate-pulse rounded bg-slate-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}