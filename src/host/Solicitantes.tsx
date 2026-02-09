// src/host/Solicitantes.tsx
import React, { useCallback, useEffect, useMemo, useState, Suspense, useRef } from "react";
import axios, { AxiosError } from "axios";
import Header from "../components/Header";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  GoogleOutlined,
  WindowsOutlined,
  CloseCircleFilled,
  LoadingOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  InfoCircleFilled,
} from "@ant-design/icons";
import { AnimatePresence, motion } from "framer-motion";
import SyncGoogleModal from "../components/SyncGoogleModal";

// ========= Config API =========
const API_URL: string =
  ((import.meta as unknown as ImportMeta).env?.VITE_API_URL as string) ||
  "http://localhost:4000/api";

const api = axios.create({ baseURL: API_URL, withCredentials: true });

// ========= Tipos locales =========
export type Empresa = { id_empresa: number; nombre: string, dominios?: string[]; };
export type Equipo = {
  id_equipo: number;
  idSolicitante: number;
  serial: string | null;
  marca: string | null;
  modelo: string | null;
  propiedad: string | null;
};
type MsLic = { skuId: string; skuPartNumber: string; displayName?: string };
type AccountType = "google" | "microsoft" | "local" | null;

export type SolicitanteRow = {
  id_solicitante: number;
  nombre: string;
  email: string | null;
  empresaId: number | null;
  empresa: Empresa | null;
  equipos: Equipo[];
  accountType: AccountType;
  googleUserId?: string | null;
  microsoftUserId?: string | null;
  msLicensesCount: number;
  msLicenses?: MsLic[];
};

// Tipos en el mismo archivo (arriba de la función o en tu bloque de tipos)
type MsSyncPayload = {
  empresaId: number;
  domain?: string;
  email?: string;
};

type MsSyncResponse = {
  total?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  // Por si el backend agrega campos extra
  [key: string]: unknown;
};


type ListParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  empresaId?: number | null;
  orderBy?: "empresa" | "nombre" | "id";
  orderDir?: "asc" | "desc";
};
type ListResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: SolicitanteRow[];
};

const prettyError = (e: unknown): string => {
  const ax = e as AxiosError<{ error?: string }>;
  return ax?.response?.data?.error || ax.message || "Error inesperado";
};

// ========= API helpers =========
async function apiListSolicitantes(params: ListParams, signal?: AbortSignal): Promise<ListResponse> {
  const { data } = await api.get<ListResponse>("/solicitantes", {
    params: { ...params, empresaId: params.empresaId ?? undefined },
    signal,
  });
  return data;
}
async function apiMetrics(params: { q?: string; empresaId?: number | null }) {
  const { data } = await api.get<{ solicitantes: number; empresas: number; equipos: number }>(
    "/solicitantes/metrics",
    { params: { ...params, empresaId: params.empresaId ?? undefined } }
  );
  return data;
}
async function apiCreateSolicitante(payload: {
  nombre: string;
  email?: string | null;
  empresaId: number;
}) {
  const { data } = await api.post<SolicitanteRow>("/solicitantes", payload);
  return data;
}
async function apiUpdateSolicitante(
  id: number,
  payload: Partial<{ nombre: string; email: string | null; empresaId: number }>
) {
  const { data } = await api.patch<SolicitanteRow>(`/solicitantes/${id}`, payload);
  return data;
}
async function apiDeleteSolicitante(
  id: number,
  opts: { transferToId?: number; fallback?: "null" | "sa" } = {}
) {
  const { data } = await api.delete<{ ok: boolean }>(`/solicitantes/${id}`, {
    params: {
      ...(opts.transferToId ? { transferToId: opts.transferToId } : {}),
      ...(opts.fallback ? { fallback: opts.fallback } : {}),
    },
  });
  return data;
}
async function apiGetSolicitante(id: number, includeMsDetails: boolean): Promise<SolicitanteRow> {
  const { data } = await api.get<SolicitanteRow>(`/solicitantes/${id}`, {
    params: { includeMsDetails },
  });
  return data;
}

// ========= UI helpers (Tailwind) =========
const clsx = (...xs: Array<string | false | null | undefined>) => xs.filter(Boolean).join(" ");

const BadgeCount: React.FC<{ count: number }> = ({ count }) => (
  <span className="inline-flex min-w-[1.75rem] justify-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
    {count}
  </span>
);

const AccountBadge: React.FC<{ type: AccountType }> = ({ type }) => {
  if (type === "google")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        <GoogleOutlined /> Google
      </span>
    );
  if (type === "microsoft")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
        <WindowsOutlined /> Microsoft
      </span>
    );
  if (type === "local")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
        Local
      </span>
    );
  return <span className="text-sm text-gray-400">—</span>;
};

const MsLicensesTag: React.FC<{ count: number; title?: string }> = ({ count, title }) =>
  count ? (
    <span title={title} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
      {count} licencia{count === 1 ? "" : "s"}
    </span>
  ) : (
    <span className="text-sm text-gray-400">—</span>
  );

// ========= Toast system =========
type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string; detail?: string };
const useToasts = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // keep push stable and reference the stable dismiss
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, ...t }]);
    // schedule dismiss using the stable dismiss reference
    setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  // keep a stable reference to dismiss for any external usage (if needed)
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  return { toasts, push, dismiss };
};
const ToastsView: React.FC<{
  toasts: Toast[];
  dismiss: (id: number) => void;
}> = ({ toasts, dismiss }) => (
  <div className="fixed top-4 right-4 z-[60] space-y-2">
    <AnimatePresence>
      {toasts.map((t) => {
        const color =
          t.kind === "success"
            ? "bg-emerald-600"
            : t.kind === "error"
              ? "bg-rose-600"
              : "bg-cyan-600";
        const Icon =
          t.kind === "success"
            ? CheckCircleFilled
            : t.kind === "error"
              ? ExclamationCircleFilled
              : InfoCircleFilled;
        return (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            className={clsx(
              "flex max-w-sm items-start gap-3 rounded-xl px-4 py-3 text-white shadow-lg",
              color
            )}
          >
            <Icon className="mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold">{t.message}</div>
              {t.detail && <div className="text-[12px] opacity-90">{t.detail}</div>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-2 rounded-lg/80 bg-white/15 px-2 py-1 text-xs hover:bg-white/25"
            >
              Cerrar
            </button>
          </motion.div>
        );
      })}
    </AnimatePresence>
  </div>
);

// ========= Modal Tailwind genérico para Crear/Editar =========
type TWModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onOk?: () => Promise<void> | void;
  okText?: string;
  children: React.ReactNode;
  okDisabled?: boolean;
  loading?: boolean;
};
const TWModal: React.FC<TWModalProps> = ({
  open,
  title,
  onClose,
  onOk,
  okText = "Guardar",
  children,
  okDisabled,
  loading,
}) => {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-black/30"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
        <motion.div
          className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-lg"
          initial={{ y: 18, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 18, opacity: 0, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <div className="mb-3 text-lg font-semibold">{title}</div>
          <div className="space-y-3">{children}</div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button className="rounded-xl border px-4 py-2 text-sm" onClick={onClose}>
              Cancelar
            </button>
            {onOk && (
              <button
                className={clsx(
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white",
                  okDisabled ? "bg-slate-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                )}
                disabled={okDisabled || loading}
                onClick={() => void onOk()}
              >
                {loading && <LoadingOutlined />}
                {okText}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ========= Estado de upsert =========
type UpsertState = { nombre: string; email: string | null; empresaId: number | null };
const emptyUpsert: UpsertState = { nombre: "", email: null, empresaId: null };

function useUpsert(initial?: Partial<UpsertState>) {
  const [v, setV] = useState<UpsertState>({ ...emptyUpsert, ...(initial ?? {}) });
  return { v, setV };
}

// ========= Validaciones =========
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const validateUpsert = (v: UpsertState) => {
  const errors: Partial<Record<keyof UpsertState, string>> = {};
  if (!v.nombre || v.nombre.trim().length < 2) errors.nombre = "Ingresa un nombre válido (mínimo 2 caracteres).";
  if (v.email && v.email.trim().length > 0 && !isEmail(v.email)) errors.email = "Email no tiene un formato válido.";
  if (!v.empresaId) errors.empresaId = "Selecciona una empresa.";
  return errors;
};

// ========= Modal de Detalle (lazy) =========
const SolicitanteDetailModal = React.lazy(() => import("../components/SolicitanteDetailModal"));
import type { SolicitanteForDetail } from "../components/SolicitanteDetailModal";

// ========= Página =========
export default function SolicitantesPage() {
  const { toasts, push, dismiss } = useToasts();

  // filtros (empresaId aquí SOLO filtra la lista)
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [orderBy, setOrderBy] = useState<"empresa" | "nombre" | "id">("empresa");
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("asc");

  // debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // data
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] =
    useState<{ solicitantes: number; empresas: number; equipos: number } | null>(null);

  // crear/editar
  const [creating, setCreating] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const createForm = useUpsert();
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof UpsertState, string>>>({});

  const [editing, setEditing] = useState<SolicitanteRow | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const editForm = useUpsert();
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof UpsertState, string>>>({});

  // detalle
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<SolicitanteForDetail | null>(null);

  // sync Google (modal separado)
  const [syncGoogleOpen, setSyncGoogleOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // ===================== Sync Microsoft (nuevo) =====================
  const [syncMsOpen, setSyncMsOpen] = useState(false);
  const [syncingMs, setSyncingMs] = useState(false);
  const [msEmpresaId, setMsEmpresaId] = useState<number | null>(null);
  const [msDomain, setMsDomain] = useState<string>("");
  const [msEmail, setMsEmail] = useState<string>("");

  const openSyncMicrosoft = () => {
    setSyncMsOpen(true);
    setMsEmpresaId(empresaId ?? null);

    const emp = empresas.find(e => e.id_empresa === empresaId);
    setMsDomain(emp?.dominios?.[0] ?? "");

    setMsEmail("");
  };

  const runSyncMicrosoft = async () => {
    if (!msEmpresaId) {
      push({ kind: "error", message: "Selecciona una empresa", detail: "Debes elegir la empresa de destino." });
      return;
    }
    try {
      setSyncingMs(true);

      const payload: MsSyncPayload = {
        empresaId: msEmpresaId,
        ...(msDomain.trim() ? { domain: msDomain.trim() } : {}),
        ...(msEmail.trim() ? { email: msEmail.trim() } : {}),
      };

      const resp = msEmail.trim()
        ? await api.put<MsSyncResponse>("/sync/microsoft/users", payload)
        : await api.post<MsSyncResponse>("/sync/microsoft/users", payload);

      const r = resp.data ?? {};
      push({
        kind: "success",
        message: "Sincronización Microsoft lista",
        detail: `Empresa: ${msEmpresaId} • Dominio: ${msDomain || "—"} • Total: ${r.total ?? 0}, Creados: ${r.created ?? 0}, Actualizados: ${r.updated ?? 0}, Omitidos: ${r.skipped ?? 0}`,
      });
      setSyncMsOpen(false);
      void reloadAll();
    } catch (e) {
      push({ kind: "error", message: "Falló la sincronización Microsoft", detail: prettyError(e) });
    } finally {
      setSyncingMs(false);
    }
  };

  // ================================================================

  // Empresas para selects (nuevo shape: { success, data, total })
  // Empresas para selects (nuevo shape: { success, data, total })
  type EmpresaApi = { id_empresa: number; nombre: string, dominios: string[];
  dominioPrincipal?: string | null; };
  type EmpresasListResponse = { success?: boolean; data: EmpresaApi[]; total?: number };

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get<EmpresasListResponse>("/empresas");
        const empresasData = Array.isArray(resp.data?.data) ? resp.data.data : [];
        const items: Empresa[] = empresasData.map((e) => ({
          id_empresa: e.id_empresa,
          nombre: e.nombre,
          dominios: Array.isArray(e.dominios) ? e.dominios : [],
        }));
        setEmpresas(items);
      } catch (e) {
        push({
          kind: "error",
          message: "No se pudieron cargar las empresas",
          detail: prettyError(e),
        });
      }
    })();
    // `push` viene del hook de toasts; lo incluimos para evitar warning del linter.
  }, [push]);


  // Lista (con cancelación) + métricas
  const fetchList = useCallback(async () => {
    setLoading(true);
    const controller = new AbortController();
    try {
      const data = await apiListSolicitantes(
        { page, pageSize, q: debouncedQ || undefined, empresaId, orderBy, orderDir },
        controller.signal
      );
      setList(data);
    } catch (e: unknown) {
      // manejo de cancelación con axios
      if (!axios.isCancel(e)) {
        push({ kind: "error", message: "No se pudo cargar la lista", detail: prettyError(e) });
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedQ, empresaId, orderBy, orderDir, push]);

  const fetchMetrics = useCallback(async () => {
    try {
      const m = await apiMetrics({ q: debouncedQ || undefined, empresaId });
      setMetrics(m);
    } catch (e) {
      push({ kind: "error", message: "No se pudieron cargar las métricas", detail: prettyError(e) });
    }
  }, [debouncedQ, empresaId, push]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);
  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  const reloadAll = async () => {
    await Promise.all([fetchList(), fetchMetrics()]);
  };

  // tooltip licencias
  const licTooltip = (r: SolicitanteRow): string | undefined =>
    r.msLicenses && r.msLicenses.length
      ? r.msLicenses.map((l) => l.displayName || l.skuPartNumber).join("\n")
      : undefined;

  // Crear / Editar
  const openCreate = () => {
    setCreating(true);
    setCreateErrors({});
    createForm.setV({ ...emptyUpsert, empresaId: empresaId ?? null });
  };

  const createInvalid = useMemo(() => {
    return Object.keys(validateUpsert(createForm.v)).length > 0;
  }, [createForm.v]);

  const saveCreate = async () => {
    const errs = validateUpsert(createForm.v);
    setCreateErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      setSavingCreate(true);
      await apiCreateSolicitante({
        nombre: createForm.v.nombre.trim(),
        email: createForm.v.email ? createForm.v.email.trim() : null,
        empresaId: createForm.v.empresaId!,
      });
      setCreating(false);
      push({ kind: "success", message: "¡Creado correctamente!", detail: "El solicitante se registró sin problemas." });
      void reloadAll();
    } catch (e) {
      push({ kind: "error", message: "No se pudo crear el solicitante", detail: prettyError(e) });
    } finally {
      setSavingCreate(false);
    }
  };

  const openEdit = (row: SolicitanteRow) => {
    setEditing(row);
    setEditErrors({});
    editForm.setV({ nombre: row.nombre, email: row.email ?? null, empresaId: row.empresaId });
  };

  const editInvalid = useMemo(() => {
    return Object.keys(validateUpsert(editForm.v)).length > 0;
  }, [editForm.v]);

  const saveEdit = async () => {
    if (!editing) return;
    const errs = validateUpsert(editForm.v);
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      setSavingEdit(true);
      await apiUpdateSolicitante(editing.id_solicitante, {
        nombre: editForm.v.nombre.trim(),
        email: editForm.v.email ? editForm.v.email.trim() : null,
        empresaId: editForm.v.empresaId!,
      });
      setEditing(null);
      push({ kind: "success", message: "¡Se ha actualizado correctamente!", detail: "Los cambios fueron guardados." });
      void reloadAll();
    } catch (e) {
      push({ kind: "error", message: "No se pudo actualizar", detail: prettyError(e) });
    } finally {
      setSavingEdit(false);
    }
  };

  const removeRow = async (row: SolicitanteRow) => {
    if (!confirm(`Eliminar a "${row.nombre}"?`)) return;
    try {
      await apiDeleteSolicitante(row.id_solicitante, { fallback: "sa" });
      push({ kind: "success", message: "Eliminado correctamente", detail: `"${row.nombre}" fue eliminado.` });
      void reloadAll();
    } catch (e) {
      push({ kind: "error", message: "No se pudo eliminar", detail: prettyError(e) });
    }
  };

  // Sync Google — la empresa se elige dentro del modal
  const openSyncGoogle = () => {
    setSyncGoogleOpen(true);
  };

  const runSyncGoogle = async ({
    empresaId,
    domain,
    email,
  }: {
    empresaId: number;
    domain: string;
    email?: string;
  }) => {
    try {
      setSyncing(true);
      const payload = { domain, empresaId, ...(email ? { email } : {}) };
      const resp = email
        ? await api.put("/sync/google/users", payload)
        : await api.post("/sync/google/users", payload);
      const r = resp?.data || {};
      push({
        kind: "success",
        message: "Sincronización completada",
        detail: `Dominio: ${domain} • Empresa: ${empresaId} • Total: ${r.total ?? 0}, Creados: ${r.created ?? 0}, Actualizados: ${r.updated ?? 0}, Omitidos: ${r.skipped ?? 0}`,
      });
      setSyncGoogleOpen(false);
      void reloadAll();
    } catch (e) {
      push({ kind: "error", message: "Falló la sincronización", detail: prettyError(e) });
    } finally {
      setSyncing(false);
    }
  };

  // Carga del detalle (por ID)
  useEffect(() => {
    const load = async () => {
      if (detailId == null) {
        setDetail(null);
        return;
      }
      try {
        const row = await apiGetSolicitante(detailId, true);
        // Mapear equipos al shape que espera el modal de detalle (agregar campos opcionales procesador/ram/disco)
        const equiposMapped: SolicitanteForDetail["equipos"] = (row.equipos ?? []).map((e) => {
          const rec = e as unknown as Record<string, unknown>;
          return {
            id_equipo: e.id_equipo,
            idSolicitante: e.idSolicitante,
            serial: e.serial,
            marca: e.marca,
            modelo: e.modelo,
            propiedad: e.propiedad,
            // propiedades adicionales opcionales que el detalle puede requerir
            procesador: typeof rec["procesador"] === "string" ? (rec["procesador"] as string) : null,
            ram: typeof rec["ram"] === "string" ? (rec["ram"] as string) : null,
            disco: typeof rec["disco"] === "string" ? (rec["disco"] as string) : null,
          };
        });

        const mapped: SolicitanteForDetail = {
          id_solicitante: row.id_solicitante,
          nombre: row.nombre,
          empresaId: row.empresaId,
          empresa: row.empresa,
          equipos: equiposMapped,
          accountType: row.accountType ?? null,
          msLicenses: Array.isArray(row.msLicenses) ? (row.msLicenses as MsLic[]) : [],
          msLicensesCount: row.msLicensesCount,
        };

        setDetail(mapped);
      } catch (e) {
        push({ kind: "error", message: "No se pudo cargar el detalle", detail: prettyError(e) });
      }
    };
    void load();
  }, [detailId, push]);

  const clearFilters = () => {
    setQ("");
    setEmpresaId(null);
    setOrderBy("empresa");
    setOrderDir("asc");
    setPage(1);
  };

  /* ======================= RENDER ======================= */
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-white via-white to-cyan-50">
      {/* Fondo decorativo */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 [background:radial-gradient(circle_at_1px_1px,rgba(14,165,233,0.08)_1px,transparent_0)_0_0/22px_22px]" />
        <div className="absolute -top-32 -left-32 w-[60vw] max-w-[520px] aspect-square rounded-full blur-3xl bg-gradient-to-br from-cyan-200 to-indigo-200 opacity-40" />
        <div className="absolute -bottom-40 -right-40 w-[65vw] max-w-[560px] aspect-square rounded-full blur-3xl bg-gradient-to-tr from-fuchsia-200 to-cyan-200 opacity-40" />
      </div>

      <Header />

      {/* Hero / Toolbar */}
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 max-w-7xl mx-auto w-full">
        <motion.div
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-cyan-200 bg-white/80 backdrop-blur-xl shadow-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="absolute inset-0 opacity-60 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(14,165,233,0.06),transparent_30%,rgba(99,102,241,0.06),transparent_60%,rgba(236,72,153,0.06),transparent_90%)]" />
          <div className="relative p-4 sm:p-6 md:p-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
              Solicitantes{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">
                RIDS.CL
              </span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">Gestiona solicitantes, cuentas y equipos. Filtra, edita y consulta detalles.</p>

            {/* Toolbar */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-10 gap-3">
              {/* Búsqueda */}
              <div className="relative md:col-span-5">
                <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600/70" />
                <input
                  className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                  placeholder="Buscar por nombre, email o empresa…"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Buscar solicitantes"
                />
                {q.length > 0 && (
                  <button
                    onClick={() => setQ("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-700/80 hover:text-cyan-900"
                    aria-label="Limpiar búsqueda"
                    title="Limpiar"
                    type="button"
                  >
                    <CloseCircleFilled />
                  </button>
                )}
              </div>

              {/* Filtro empresa (SOLO filtra la lista/tabla) */}
              <div className="md:col-span-3">
                <select
                  className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  value={empresaId ?? ""}
                  onChange={(e) => {
                    setEmpresaId(e.target.value ? Number(e.target.value) : null);
                    setPage(1);
                  }}
                  aria-label="Filtrar por empresa"
                >
                  <option value="">Todas las empresas</option>
                  {empresas.map((e) => (
                    <option key={e.id_empresa} value={e.id_empresa}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Orden */}
              <div className="md:col-span-2">
                <select
                  className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  value={`${orderBy}:${orderDir}`}
                  onChange={(e) => {
                    const [ob, od] = e.target.value.split(":") as ["empresa" | "nombre" | "id", "asc" | "desc"];
                    setOrderBy(ob);
                    setOrderDir(od);
                    setPage(1);
                  }}
                  aria-label="Ordenar"
                >
                  <option value="empresa:asc">Empresa A→Z</option>
                  <option value="empresa:desc">Empresa Z→A</option>
                  <option value="nombre:asc">Nombre A→Z</option>
                  <option value="nombre:desc">Nombre Z→A</option>
                  <option value="id:asc">ID ↑</option>
                  <option value="id:desc">ID ↓</option>
                </select>
              </div>

              {/* Acciones */}
              <div className="md:col-span-10 grid grid-cols-1 sm:grid-cols-5 gap-2">
                <button
                  onClick={clearFilters}
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-cyan-800 hover:bg-cyan-50 active:scale-[0.98] transition duration-200 w-full min-w-[120px] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  title="Limpiar filtros"
                >
                  <CloseCircleFilled className="hidden sm:inline" />
                  <span className="truncate">Limpiar</span>
                </button>

                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm border-cyan-200 text-cyan-800 bg-white hover:bg-cyan-50 transition w-full min-w-[120px]"
                  onClick={() => void reloadAll()}
                  title="Recargar"
                >
                  <ReloadOutlined /> <span className="hidden sm:inline">Recargar</span>
                </button>

                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-600 px-3 py-2.5 text-sm font-medium text-white hover:brightness-110 active:scale-[0.98] transition duration-200 w-full min-w-[120px] shadow-[0_6px_18px_-6px_rgba(16,185,129,0.45)]"
                  onClick={openCreate}
                  title="Nuevo solicitante"
                >
                  <PlusOutlined /> <span className="hidden sm:inline">Nuevo</span>
                </button>

                {/* Botón Google con estética Googley */}
                <button
                  className={clsx(
                    "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-white transition w-full min-w-[120px]",
                    syncing
                      ? "bg-gradient-to-tr from-[#A8C7FA] to-[#81C995] cursor-wait"
                      : "bg-gradient-to-tr from-[#34A853] to-[#4285F4] hover:brightness-110 active:scale-[0.98] shadow-[0_6px_18px_-6px_rgba(66,133,244,0.45)]"
                  )}
                  onClick={openSyncGoogle}
                  disabled={syncing}
                  title="Actualizar cuentas desde Google Workspace"
                >
                  <GoogleOutlined /> <span className="hidden sm:inline">Actualizar Google</span>
                </button>

                {/* Botón Microsoft con estética Windows */}
                <button
                  className={clsx(
                    "inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-white transition w-full min-w-[120px]",
                    syncingMs
                      ? "bg-gradient-to-tr from-blue-400 to-blue-500 cursor-wait"
                      : "bg-gradient-to-tr from-blue-700 to-blue-600 hover:brightness-110 active:scale-[0.98] shadow-[0_6px_18px_-6px_rgba(37,99,235,0.45)]"
                  )}
                  onClick={openSyncMicrosoft}
                  disabled={syncingMs}
                  title="Actualizar cuentas desde Microsoft 365"
                >
                  <WindowsOutlined /> <span className="hidden sm:inline">Actualizar Microsoft</span>
                </button>
              </div>
            </div>

            {/* Separador */}
            <div className="mt-4 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
          </div>
        </motion.div>
      </div>

      {/* Métricas */}
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 mt-4 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.2 }}
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
        >
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">Solicitantes</div>
            <div className="mt-1 text-2xl font-semibold">{metrics?.solicitantes ?? 0}</div>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">Empresas</div>
            <div className="mt-1 text-2xl font-semibold">{metrics?.empresas ?? 0}</div>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">Equipos</div>
            <div className="mt-1 text-2xl font-semibold">{metrics?.equipos ?? 0}</div>
          </div>
        </motion.div>
      </div>

      {/* Lista responsiva: Cards (mobile) / Tabla (md+) */}
      <main className="px-3 sm:px-4 md:px-6 lg:px-8 pb-24 md:pb-10 mt-4 max-w-7xl mx-auto w-full">
        {/* Cards (mobile) */}
        <section className="md:hidden space-y-3" aria-live="polite" aria-busy={loading ? "true" : "false"}>
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`skc-${i}`} className="rounded-2xl border border-cyan-200 bg-white p-4 animate-pulse">
                  <div className="h-4 w-28 bg-cyan-50 rounded mb-2" />
                  <div className="h-3 w-3/4 bg-cyan-50 rounded mb-2" />
                  <div className="h-3 w-1/2 bg-cyan-50 rounded" />
                </div>
              ))}
            </div>
          )}
          <AnimatePresence>
            {!loading && (list?.items?.length ?? 0) === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="rounded-2xl border border-cyan-200 bg-white text-slate-600 p-4 text-center"
              >
                Sin resultados.
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!loading &&
              list?.items?.map((r) => {
                const empresaNombre = r.empresa?.nombre ?? "—";
                return (
                  <motion.article
                    key={r.id_solicitante}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-2xl border border-cyan-200 bg-white p-4 transition hover:shadow-md"
                  >
                    <header className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-slate-500">#{r.id_solicitante}</div>
                        <button className="text-base font-semibold text-cyan-700 hover:underline" onClick={() => setDetailId(r.id_solicitante)} title="Ver detalle">
                          {r.nombre}
                        </button>
                        <p className="text-xs text-slate-600 mt-0.5">{empresaNombre}</p>
                      </div>
                      <AccountBadge type={r.accountType} />
                    </header>

                    <p className="text-sm text-slate-700 mt-2">
                      <span className="text-slate-500">Email:</span> {r.email ?? "—"}
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      <BadgeCount count={r.equipos?.length ?? 0} />
                      <MsLicensesTag count={r.msLicensesCount} title={licTooltip(r)} />
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setDetailId(r.id_solicitante)}
                        className="col-span-1 rounded-xl border border-cyan-200 bg-white/90 text-cyan-800 px-2 py-2 text-sm hover:bg-cyan-50"
                        aria-label={`Ver detalle de ${r.nombre}`}
                      >
                        Detalle
                      </button>
                      <button
                        onClick={() => openEdit(r)}
                        className="col-span-1 inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-200 text-emerald-700 px-2 py-2 text-sm hover:bg-emerald-50"
                        aria-label={`Editar solicitante ${r.nombre}`}
                      >
                        <EditOutlined />
                        Editar
                      </button>
                      <button
                        onClick={() => void removeRow(r)}
                        className="col-span-1 inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 text-rose-700 px-2 py-2 text-sm hover:bg-rose-50"
                        aria-label={`Eliminar solicitante ${r.nombre}`}
                      >
                        <DeleteOutlined />
                        Eliminar
                      </button>
                    </div>
                  </motion.article>
                );
              })}
          </AnimatePresence>
        </section>

        {/* Tabla (desktop) */}
        <section className="hidden md:block rounded-3xl border border-cyan-200 bg-white overflow-hidden" aria-live="polite" aria-busy={loading ? "true" : "false"}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-cyan-50 to-indigo-50 text-slate-800 border-b border-cyan-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 w-16 text-left font-semibold">ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                  <th className="px-4 py-3 text-left font-semibold">Empresa</th>
                  <th className="px-4 py-3 text-center font-semibold">Equipos</th>
                  <th className="px-4 py-3 text-left font-semibold">Cuenta</th>
                  <th className="px-4 py-3 text-left font-semibold">Licencias MS</th>
                  <th className="px-4 py-3 w-56 text-left font-semibold">Acciones</th>
                </tr>
              </thead>
              <AnimatePresence initial={false}>
                <tbody className="text-slate-800">
                  {loading &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={`skt-${i}`} className="border-t border-cyan-100 animate-pulse">
                        <td className="px-4 py-3">
                          <div className="h-4 w-10 bg-cyan-50 rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 w-40 bg-cyan-50 rounded" />
                          <div className="h-3 w-28 bg-cyan-50 rounded mt-2" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 w-28 bg-cyan-50 rounded" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="h-4 w-10 bg-cyan-50 rounded inline-block" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 w-20 bg-cyan-50 rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-4 w-24 bg-cyan-50 rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="h-8 w-40 bg-cyan-50 rounded" />
                        </td>
                      </tr>
                    ))}

                  {!loading && (list?.items?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-600">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          Sin resultados
                        </motion.div>
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    list?.items?.map((r) => (
                      <motion.tr
                        key={r.id_solicitante}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="border-t border-cyan-100 transition-colors odd:bg-white even:bg-slate-50/40 hover:bg-cyan-50/60"
                      >
                        <td className="px-4 py-3">{r.id_solicitante}</td>
                        <td className="px-4 py-3">
                          <button
                            className="text-left text-cyan-700 hover:underline"
                            onClick={() => setDetailId(r.id_solicitante)}
                            title="Ver detalle"
                            aria-label={`Ver detalle de ${r.nombre}`}
                          >
                            {r.nombre}
                          </button>
                          <div className="text-xs text-slate-500">{r.email ?? "—"}</div>
                        </td>
                        <td className="px-4 py-3">
                          {r.empresa?.nombre ? (
                            <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700">
                              {r.empresa.nombre}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <BadgeCount count={r.equipos?.length ?? 0} />
                        </td>
                        <td className="px-4 py-3">
                          <AccountBadge type={r.accountType} />
                        </td>
                        <td className="px-4 py-3">
                          <MsLicensesTag count={r.msLicensesCount} title={licTooltip(r)} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 text-emerald-700 px-2 py-1 hover:bg-emerald-50 transition"
                              onClick={() => openEdit(r)}
                              aria-label={`Editar solicitante ${r.nombre}`}
                            >
                              <EditOutlined /> Editar
                            </button>
                            <button
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 text-rose-700 px-2 py-1 hover:bg-rose-50 transition"
                              onClick={() => void removeRow(r)}
                              aria-label={`Eliminar solicitante ${r.nombre}`}
                            >
                              <DeleteOutlined /> Eliminar
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                </tbody>
              </AnimatePresence>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between border-t px-4 py-3 bg-slate-50 text-sm">
            <div>
              {list
                ? `${(list.page - 1) * list.pageSize + 1}-${Math.min(
                  list.page * list.pageSize,
                  list.total
                )} de ${list.total}`
                : "0-0 de 0"}
            </div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-lg border px-2 py-1"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                aria-label="Tamaño de página"
              >
                {[10, 20, 50, 100].map((s) => (
                  <option key={s} value={s}>
                    {s}/pág
                  </option>
                ))}
              </select>
              <button
                className="rounded-lg border px-3 py-1 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Página anterior"
                title="Página anterior"
              >
                ←
              </button>
              <div>
                Página {list?.page ?? page} / {list?.totalPages ?? 1}
              </div>
              <button
                className="rounded-lg border px-3 py-1 disabled:opacity-50"
                disabled={!list || page >= list.totalPages}
                onClick={() => setPage((p) => (list ? Math.min(list.totalPages, p + 1) : p))}
                aria-label="Página siguiente"
                title="Página siguiente"
              >
                →
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Modal Crear */}
      <TWModal
        open={creating}
        title="Nuevo solicitante"
        onClose={() => setCreating(false)}
        onOk={saveCreate}
        okText="Crear"
        okDisabled={createInvalid}
        loading={savingCreate}
      >
        <label className="block text-sm">
          Nombre
          <input
            className={clsx(
              "mt-1 w-full rounded-xl border px-3 py-2",
              createErrors.nombre ? "border-rose-300 focus:border-rose-400" : ""
            )}
            value={createForm.v.nombre}
            onChange={(e) => {
              const v = { ...createForm.v, nombre: e.target.value };
              createForm.setV(v);
              setCreateErrors((prev) => ({ ...prev, nombre: undefined }));
            }}
          />
          {createErrors.nombre && <div className="mt-1 text-xs text-rose-600">{createErrors.nombre}</div>}
        </label>
        <label className="block text-sm">
          Email
          <input
            className={clsx(
              "mt-1 w-full rounded-xl border px-3 py-2",
              createErrors.email ? "border-rose-300 focus:border-rose-400" : ""
            )}
            value={createForm.v.email ?? ""}
            onChange={(e) => {
              const v = { ...createForm.v, email: e.target.value || null };
              createForm.setV(v);
              setCreateErrors((prev) => ({ ...prev, email: undefined }));
            }}
          />
          {createErrors.email && <div className="mt-1 text-xs text-rose-600">{createErrors.email}</div>}
        </label>
        <label className="block text-sm">
          Empresa
          <select
            className={clsx(
              "mt-1 w-full rounded-xl border px-3 py-2",
              createErrors.empresaId ? "border-rose-300 focus:border-rose-400" : ""
            )}
            value={createForm.v.empresaId ?? ""}
            onChange={(e) => {
              const v = { ...createForm.v, empresaId: e.target.value ? Number(e.target.value) : null };
              createForm.setV(v);
              setCreateErrors((prev) => ({ ...prev, empresaId: undefined }));
            }}
          >
            <option value="">Selecciona…</option>
            {empresas.map((e) => (
              <option key={e.id_empresa} value={e.id_empresa}>
                {e.nombre}
              </option>
            ))}
          </select>
          {createErrors.empresaId && <div className="mt-1 text-xs text-rose-600">{createErrors.empresaId}</div>}
        </label>
      </TWModal>

      {/* Modal Editar */}
      <TWModal
        open={!!editing}
        title="Editar solicitante"
        onClose={() => setEditing(null)}
        onOk={saveEdit}
        okText="Guardar"
        okDisabled={editInvalid}
        loading={savingEdit}
      >
        <label className="block text-sm">
          Nombre
          <input
            className={clsx(
              "mt-1 w-full rounded-xl border px-3 py-2",
              editErrors.nombre ? "border-rose-300 focus:border-rose-400" : ""
            )}
            value={editForm.v.nombre}
            onChange={(e) => {
              const v = { ...editForm.v, nombre: e.target.value };
              editForm.setV(v);
              setEditErrors((prev) => ({ ...prev, nombre: undefined }));
            }}
          />
          {editErrors.nombre && <div className="mt-1 text-xs text-rose-600">{editErrors.nombre}</div>}
        </label>
        <label className="block text-sm">
          Email
          <input
            className={clsx(
              "mt-1 w-full rounded-xl border px-3 py-2",
              editErrors.email ? "border-rose-300 focus:border-rose-400" : ""
            )}
            value={editForm.v.email ?? ""}
            onChange={(e) => {
              const v = { ...editForm.v, email: e.target.value || null };
              editForm.setV(v);
              setEditErrors((prev) => ({ ...prev, email: undefined }));
            }}
          />
          {editErrors.email && <div className="mt-1 text-xs text-rose-600">{editErrors.email}</div>}
        </label>
        <label className="block text-sm">
          Empresa
          <select
            className={clsx(
              "mt-1 w-full rounded-xl border px-3 py-2",
              editErrors.empresaId ? "border-rose-300 focus:border-rose-400" : ""
            )}
            value={editForm.v.empresaId ?? ""}
            onChange={(e) => {
              const v = { ...editForm.v, empresaId: e.target.value ? Number(e.target.value) : null };
              editForm.setV(v);
              setEditErrors((prev) => ({ ...prev, empresaId: undefined }));
            }}
          >
            <option value="">Selecciona…</option>
            {empresas.map((e) => (
              <option key={e.id_empresa} value={e.id_empresa}>
                {e.nombre}
              </option>
            ))}
          </select>
          {editErrors.empresaId && <div className="mt-1 text-xs text-rose-600">{editErrors.empresaId}</div>}
        </label>
      </TWModal>

      {/* Modal Sync Google — ahora elige la empresa en el modal */}
      <SyncGoogleModal
        open={syncGoogleOpen}
        empresas={empresas}
        syncing={syncing}
        onClose={() => setSyncGoogleOpen(false)}
        onSubmit={runSyncGoogle}
      />

      {/* Modal Sync Microsoft */}
      <TWModal
        open={syncMsOpen}
        title="Actualizar Microsoft 365"
        onClose={() => setSyncMsOpen(false)}
        onOk={runSyncMicrosoft}
        okText="Sincronizar"
        loading={syncingMs}
        okDisabled={!msEmpresaId}
      >
        <div className="grid gap-3">
          <label className="block text-sm">
            Empresa
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={msEmpresaId ?? ""}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                setMsEmpresaId(id);

                const emp = empresas.find(x => x.id_empresa === id);
                const dominioPrincipal = emp?.dominios?.[0] ?? "";

                setMsDomain(dominioPrincipal);
              }}

            >
              <option value="">Selecciona…</option>
              {empresas.map((e) => (
                <option key={e.id_empresa} value={e.id_empresa}>{e.nombre}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            Dominio (opcional)
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="p.ej. grupocolchagua.cl"
              value={msDomain}
              onChange={(e) => setMsDomain(e.target.value)}
            />
            <div className="mt-1 text-[11px] text-slate-500">
              Si lo dejas vacío, sincroniza todo el tenant permitido por tus credenciales.
            </div>
          </label>

          <label className="block text-sm">
            Email específico (opcional)
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="usuario@grupocolchagua.cl"
              value={msEmail}
              onChange={(e) => setMsEmail(e.target.value)}
            />
            <div className="mt-1 text-[11px] text-slate-500">
              Si indicas un email, se sincroniza solo ese usuario (usa método PUT).
            </div>
          </label>
        </div>
      </TWModal>

      {/* Modal de Detalle */}
      <Suspense fallback={null}>
        {detail && (
          <SolicitanteDetailModal
            open
            onClose={() => {
              setDetail(null);
              setDetailId(null);
            }}
            solicitante={detail}
          />
        )}
      </Suspense>

      {/* Toasts */}
      <ToastsView toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
