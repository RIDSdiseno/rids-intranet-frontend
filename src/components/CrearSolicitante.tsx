// src/components/CrearSolicitante.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LoadingOutlined,
  SaveOutlined,
  CloseOutlined,
  SearchOutlined,
  ClearOutlined,
  CheckCircleTwoTone,
  ExclamationCircleOutlined,
  ApartmentOutlined,
  UserAddOutlined,
  CheckOutlined,
} from "@ant-design/icons";

type Empresa = { id_empresa: number; nombre: string };

type CreatedSolicitante = {
  id_solicitante: number;
  nombre: string;
  email: string | null;
  empresaId: number;
  empresa?: { id_empresa: number; nombre: string };
};

type CrearSolicitanteProps = {
  onSuccess?: (created: CreatedSolicitante) => void;
  onCancel?: () => void;
  defaultEmpresaId?: number;
};

const API_URL =
  (import.meta as ImportMeta).env.VITE_API_URL || "http://localhost:4000/api";

const tokenHeader = (): HeadersInit => {
  const token = localStorage.getItem("accessToken");
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};

/* ===== helpers ===== */
function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function getApiErrorMessage(payload: unknown, status: number): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error?: unknown }).error === "string" &&
    (payload as { error: string }).error.trim()
  ) {
    return (payload as { error: string }).error;
  }
  return `Error ${status}`;
}

function tokenize(s: string) {
  return normalize(s)
    .split(/\s+/)
    .filter(Boolean);
}
function emailValid(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function highlight(text: string, tokens: string[]): React.ReactNode {
  if (tokens.length === 0) return text;
  const norm = normalize(text);
  // construimos segmentos manteniendo mayúsculas del original
  let i = 0;
  const parts: React.ReactNode[] = [];
  while (i < text.length) {
    let longest: { len: number; t: string } | null = null;
    for (const t of tokens) {
      if (!t) continue;
      if (norm.slice(i).startsWith(t)) {
        if (!longest || t.length > longest.len) longest = { len: t.length, t };
      }
    }
    if (longest) {
      const piece = text.slice(i, i + longest.len);
      parts.push(
        <mark
          key={`${i}-${piece}`}
          className="bg-yellow-100/80 text-yellow-900 rounded px-0.5"
        >
          {piece}
        </mark>
      );
      i += longest.len;
    } else {
      parts.push(text[i]);
      i += 1;
    }
  }
  return <>{parts}</>;
}

/* Simple spinner SVG (para overlays) */
const Spinner: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

const CrearSolicitante: React.FC<CrearSolicitanteProps> = ({
  onSuccess,
  onCancel,
  defaultEmpresaId,
}) => {
  // Form state
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState<string>("");
  const [empresaId, setEmpresaId] = useState<string>(
    defaultEmpresaId ? String(defaultEmpresaId) : ""
  );

  // UI state
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // búsqueda mejorada + dropdown propio
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState(search);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 220);
    return () => clearTimeout(t);
  }, [search]);

  // Cargar empresas
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingEmpresas(true);
        const url = new URL(`${API_URL}/empresas`);
        url.searchParams.set("pageSize", "3000"); // amplio para filtrar local
        const r = await fetch(url.toString(), { headers: tokenHeader() });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const j = (await r.json()) as { items?: Empresa[]; data?: Empresa[] };
        setEmpresas(j.items ?? j.data ?? []);
      } catch {
        setError("No se pudieron cargar las empresas.");
      } finally {
        setLoadingEmpresas(false);
      }
    };
    void load();
  }, []);

  // Filtrado avanzado con score
  const empresasFiltradas = useMemo(() => {
    const base = empresas;
    if (!searchDebounced.trim()) {
      // si ya hay empresa seleccionada, priorízala al tope
      if (empresaId) {
        const sel = base.find((e) => String(e.id_empresa) === empresaId);
        const rest = base.filter((e) => String(e.id_empresa) !== empresaId);
        return sel ? [sel, ...rest.slice(0, 199)] : base.slice(0, 200);
      }
      return base.slice(0, 200);
    }
    const tokens = tokenize(searchDebounced);
    if (tokens.length === 0) return base.slice(0, 200);

    const scored: Array<{ emp: Empresa; score: number }> = [];
    for (const emp of base) {
      const normName = normalize(emp.nombre);
      const allMatch = tokens.every((t) => normName.includes(t));
      if (!allMatch) continue;
      let score = 0;
      for (const t of tokens) {
        if (normName.startsWith(t)) score += 3;
        else if (normName.includes(t)) score += 1;
      }
      scored.push({ emp, score });
    }
    scored.sort((a, b) =>
      b.score !== a.score ? b.score - a.score : a.emp.nombre.localeCompare(b.emp.nombre, "es")
    );
    return scored.slice(0, 200).map((s) => s.emp);
  }, [empresas, searchDebounced, empresaId]);

  // Abrir dropdown automáticamente cuando hay filtro
  useEffect(() => {
    setDropdownOpen(!!searchDebounced.trim());
    setActiveIndex(-1);
  }, [searchDebounced]);

  // Cerrar dropdown al click fuera
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  /* ===== Validaciones por campo ===== */
  const [touched, setTouched] = useState<{ nombre?: boolean; email?: boolean; empresa?: boolean }>({});
  const nombreError =
    touched.nombre && !nombre.trim() ? "El nombre es obligatorio." : null;
  const empresaError =
    touched.empresa && !empresaId ? "Debes seleccionar una empresa." : null;
  const emailError =
    touched.email && email.trim() && !emailValid(email.trim())
      ? "El correo no tiene un formato válido."
      : null;

  const validarGlobal = (): string | null => {
    if (!nombre.trim()) return "El nombre es obligatorio.";
    if (!empresaId) return "Debes seleccionar una empresa.";
    if (email.trim() && !emailValid(email.trim()))
      return "El correo no tiene un formato válido.";
    return null;
  };

  /* ===== Submit ===== */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    setTouched({ nombre: true, email: true, empresa: true });

    const v = validarGlobal();
    if (v) {
      setError(v);
      return;
    }

    try {
      setSubmitting(true);
      const body = {
        nombre: nombre.trim(),
        email: email.trim() ? email.trim() : null,
        empresaId: Number(empresaId),
      };

      const r = await fetch(`${API_URL}/solicitantes`, {
        method: "POST",
        headers: tokenHeader(),
        body: JSON.stringify(body),
      });

      // Intentar parsear JSON, pero sin explotar si viene vacío
      let j: unknown = null;
      try {
        j = await r.json();
      } catch {
        /* puede no haber body */
      }

      // Si la API devolvió error, intenta tomar el mensaje del payload
      if (!r.ok) {
        const apiErr = getApiErrorMessage(j, r.status);
        throw new Error(apiErr);
      }


      // En éxito, aseguremos forma mínima para onSuccess
      const created = (j ?? {}) as Partial<CreatedSolicitante>;
      setOkMsg("Solicitante creado correctamente.");

      if (onSuccess) {
        // Si falta algún campo, igual pasamos lo que vino
        onSuccess(created as CreatedSolicitante);
        return; // el padre cierra y recarga
      }

      // Reset si es standalone
      setNombre("");
      setEmail("");
      setEmpresaId(defaultEmpresaId ? String(defaultEmpresaId) : "");
      setSearch("");
      setDropdownOpen(false);
      searchInputRef.current?.focus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No se pudo crear el solicitante.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onPickEmpresa = (emp: Empresa) => {
    setEmpresaId(String(emp.id_empresa));
    setSearch(emp.nombre);
    setDropdownOpen(false);
    setTouched((t) => ({ ...t, empresa: true }));
    // después de elegir empresa, lleva el foco al nombre
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  // Navegación con teclado en dropdown
  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen || empresasFiltradas.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % empresasFiltradas.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? empresasFiltradas.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = activeIndex >= 0 ? activeIndex : 0;
      const emp = empresasFiltradas[idx];
      if (emp) onPickEmpresa(emp);
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  };

  const tokens = useMemo(() => tokenize(searchDebounced), [searchDebounced]);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-2xl mx-auto rounded-3xl border border-cyan-200/60 bg-white/80 backdrop-blur-xl shadow-[0_16px_50px_-20px_rgba(14,165,233,0.45)] overflow-hidden"
      aria-busy={submitting ? "true" : "false"}
    >
      {/* Header con gradiente */}
      <div className="px-6 pt-6 pb-4 bg-gradient-to-r from-cyan-50 via-white to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center h-10 w-10 rounded-2xl border border-cyan-200 bg-white text-cyan-700">
            <UserAddOutlined />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Nuevo solicitante
            </h2>
            <p className="text-sm text-slate-600">
              Registra un solicitante y asócialo a su empresa.
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />

      {/* Alerts */}
      <div className="px-6 pt-4">
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-rose-700">
            <ExclamationCircleOutlined className="mt-0.5" />
            <div className="text-sm">{error}</div>
          </div>
        )}
        {okMsg && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-emerald-700">
            <CheckCircleTwoTone twoToneColor="#10b981" className="mt-0.5" />
            <div className="text-sm">{okMsg}</div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6 relative">
        {/* Empresa */}
        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Empresa <span className="text-rose-500">*</span>
          </label>

          {/* Chip seleccionada */}
          {empresaId && (
            <div className="mb-2 inline-flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-white px-2 py-0.5 text-cyan-800">
                <ApartmentOutlined />
                {
                  empresas.find((e) => String(e.id_empresa) === empresaId)?.nombre ??
                  "Seleccionada"
                }
              </span>
              <button
                type="button"
                onClick={() => { setEmpresaId(""); setSearch(""); setTimeout(() => searchInputRef.current?.focus(), 0); }}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-slate-600 hover:bg-slate-50"
                title="Quitar selección"
              >
                <ClearOutlined /> Limpiar
              </button>
            </div>
          )}

          {/* Buscador */}
          <div className="relative">
            <SearchOutlined className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600/60" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar empresa… (prefijo o por palabras)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => searchDebounced.trim() && setDropdownOpen(true)}
              onKeyDown={onSearchKeyDown}
              disabled={loadingEmpresas || submitting}
              className={`
                w-full rounded-2xl border bg-white pl-9 pr-10 py-2.5 text-sm
                ${empresaError ? "border-rose-300 focus:border-rose-400 focus:ring-rose-400/40" : "border-cyan-200 focus:border-cyan-400 focus:ring-cyan-500/30"}
                text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition
              `}
              aria-label="Buscar empresa"
            />
            {/* Clear */}
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-700/70 hover:text-cyan-900"
                aria-label="Limpiar búsqueda"
                title="Limpiar"
              >
                <ClearOutlined />
              </button>
            )}
          </div>

          {/* Dropdown */}
          {dropdownOpen && (
            <div
              className="absolute z-20 mt-2 w-full rounded-2xl border border-cyan-200 bg-white shadow-xl overflow-hidden"
              role="listbox"
            >
              <div className="px-3 py-2 text-[11px] text-slate-500 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-indigo-50">
                {loadingEmpresas
                  ? "Cargando empresas…"
                  : searchDebounced.trim()
                  ? empresasFiltradas.length > 0
                    ? `Resultados: ${empresasFiltradas.length}`
                    : "Sin resultados"
                  : `Total empresas: ${empresas.length}`}
              </div>

              <div className="max-h-60 overflow-auto">
                {loadingEmpresas ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-slate-600">
                    <LoadingOutlined className="animate-spin" /> Cargando…
                  </div>
                ) : empresasFiltradas.length === 0 ? (
                  <div className="px-3 py-3 text-slate-600 text-sm">
                    No hay coincidencias para “{searchDebounced}”.
                  </div>
                ) : (
                  <ul>
                    {empresasFiltradas.map((emp, idx) => {
                      const selected = String(emp.id_empresa) === empresaId;
                      const active = idx === activeIndex;
                      return (
                        <li
                          key={emp.id_empresa}
                          role="option"
                          aria-selected={selected}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onMouseDown={(ev) => {
                            ev.preventDefault(); // evita blur del input
                            onPickEmpresa(emp);
                          }}
                          className={`
                            cursor-pointer px-3 py-2 text-sm flex items-center justify-between
                            ${active ? "bg-cyan-50" : "bg-white"}
                            ${selected ? "text-cyan-800 font-medium" : "text-slate-800"}
                            hover:bg-cyan-50
                          `}
                          title={emp.nombre}
                        >
                          <div className="truncate">
                            {tokens.length ? highlight(emp.nombre, tokens) : emp.nombre}
                          </div>
                          {selected && (
                            <span className="ml-3 text-cyan-700">
                              <CheckOutlined />
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Select accesible (fallback) */}
          <select
            value={empresaId}
            onBlur={() => setTouched((t) => ({ ...t, empresa: true }))}
            onChange={(e) => setEmpresaId(e.target.value)}
            disabled={loadingEmpresas || submitting}
            className="mt-2 w-full rounded-2xl border border-cyan-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400"
            aria-label="Seleccionar empresa (accesible)"
          >
            <option value="">{loadingEmpresas ? "Cargando…" : "— Selecciona —"}</option>
            {empresasFiltradas.map((emp) => (
              <option key={emp.id_empresa} value={String(emp.id_empresa)}>
                {emp.nombre}
              </option>
            ))}
          </select>

          {empresaError && (
            <p className="mt-1 text-xs text-rose-600">{empresaError}</p>
          )}
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nombre <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              ref={nameInputRef}
              type="text"
              placeholder="Ej: Juan Pérez"
              value={nombre}
              onBlur={() => setTouched((t) => ({ ...t, nombre: true }))}
              onChange={(e) => setNombre(e.target.value)}
              disabled={submitting}
              className={`
                w-full px-3 py-2.5 rounded-2xl border text-sm bg-white
                ${nombreError ? "border-rose-300 focus:border-rose-400 focus:ring-rose-400/40" : "border-cyan-200 focus:border-cyan-400 focus:ring-cyan-500/30"}
                text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition
              `}
            />
            {nombreError && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500">
                <ExclamationCircleOutlined />
              </span>
            )}
          </div>
          {nombreError && (
            <p className="mt-1 text-xs text-rose-600">{nombreError}</p>
          )}
        </div>

        {/* Email (opcional) */}
        <div>
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Correo electrónico
            </label>
            <span className="text-xs text-slate-400">(opcional)</span>
          </div>
          <div className="relative">
            <input
              type="email"
              placeholder="usuario@correo.cl"
              value={email}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className={`
                w-full px-3 py-2.5 rounded-2xl border text-sm bg-white
                ${emailError ? "border-rose-300 focus:border-rose-400 focus:ring-rose-400/40" : "border-cyan-200 focus:border-cyan-400 focus:ring-cyan-500/30"}
                text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition
              `}
            />
            {emailError ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500">
                <ExclamationCircleOutlined />
              </span>
            ) : email.trim() ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600">
                <CheckOutlined />
              </span>
            ) : null}
          </div>
          {emailError && (
            <p className="mt-1 text-xs text-rose-600">{emailError}</p>
          )}
        </div>

        {/* Footer acciones */}
        <div className="flex items-center justify-end gap-2 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-cyan-200 text-cyan-800 bg-white hover:bg-cyan-50 transition disabled:opacity-60"
            >
              <CloseOutlined /> Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl
                       bg-gradient-to-br from-cyan-600 to-indigo-600 hover:brightness-110 text-white
                       shadow-[0_10px_24px_-10px_rgba(14,165,233,0.45)] disabled:opacity-60 transition"
          >
            {submitting ? (
              <>
                <LoadingOutlined className="animate-spin" /> Creando…
              </>
            ) : (
              <>
                <SaveOutlined /> Crear solicitante
              </>
            )}
          </button>
        </div>

        {/* Overlay de bloqueo cuando envía */}
        {submitting && (
          <div
            className="absolute inset-0 z-30 grid place-items-center bg-white/60 backdrop-blur-sm rounded-3xl"
            aria-hidden="true"
          >
            <div className="flex items-center gap-3 text-cyan-700">
              <Spinner className="w-6 h-6 text-cyan-700" />
              <span className="font-medium">Creando solicitante…</span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default CrearSolicitante;
