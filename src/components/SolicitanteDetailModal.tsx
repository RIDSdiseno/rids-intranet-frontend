// src/components/SolicitanteDetailModal.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CloseOutlined,
  LaptopOutlined,
  HddOutlined,
  DatabaseOutlined,
  TagOutlined,
  BarcodeOutlined,
  InfoCircleOutlined,
  CopyOutlined,
  DownOutlined,
  UpOutlined,
} from "@ant-design/icons";

/* ================= Tipos ================= */
export type Empresa = { id_empresa: number; nombre: string } | null;

export type Equipo = {
  id_equipo: number;
  idSolicitante: number;
  serial: string | null;
  marca: string | null;
  modelo: string | null;
  procesador: string | null;
  ram: string | null;
  disco: string | null;
  propiedad: string | null;
};

/** NUEVO: tipos para cuenta/licencias */
export type AccountType = "google" | "microsoft" | "manual" | string | null;

export type MsLicense = {
  skuId: string;
  skuPartNumber: string;
  displayName?: string;
  licenseType?: string; // Business | Enterprise | Education | ...
  licenseTier?: string; // Basic | Standard | Premium | E1 | E3 | E5...
};

export type SolicitanteForDetail = {
  id_solicitante: number;
  nombre: string;
  empresaId: number | null;
  empresa: Empresa;
  equipos: Equipo[];

  /** NUEVO */
  accountType?: AccountType;
  msLicenses?: MsLicense[];
  msLicensesCount?: number; // compat si el backend sólo devuelve el conteo
};

type DetailModalProps = {
  open: boolean;
  onClose: () => void;
  solicitante: SolicitanteForDetail | null;
};

/* ============== Helpers de estilo (colores estables) ============== */
function strHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const COMPANY_TAG_PALETTE = [
  "border-emerald-200 bg-emerald-50 text-emerald-900",
  "border-teal-200 bg-teal-50 text-teal-900",
  "border-cyan-200 bg-cyan-50 text-cyan-900",
  "border-sky-200 bg-sky-50 text-sky-900",
  "border-blue-200 bg-blue-50 text-blue-900",
  "border-indigo-200 bg-indigo-50 text-indigo-900",
  "border-violet-200 bg-violet-50 text-violet-900",
  "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900",
  "border-rose-200 bg-rose-50 text-rose-900",
  "border-red-200 bg-red-50 text-red-900",
  "border-orange-200 bg-orange-50 text-orange-900",
  "border-amber-200 bg-amber-50 text-amber-900",
  "border-lime-200 bg-lime-50 text-lime-900",
  "border-green-200 bg-green-50 text-green-900",
];
function companyTagClasses(emp?: Empresa) {
  if (!emp) return "border-neutral-200 bg-neutral-50 text-neutral-700";
  const seed =
    typeof emp.id_empresa === "number"
      ? String(emp.id_empresa)
      : emp.nombre || "empresa";
  const idx = strHash(seed) % COMPANY_TAG_PALETTE.length;
  return COMPANY_TAG_PALETTE[idx];
}

function brandTagClasses(brand?: string | null) {
  const b = (brand || "").trim().toLowerCase();
  if (/apple|macbook|imac|mac/.test(b))
    return "border-slate-300 bg-slate-50 text-slate-900";
  if (/dell/.test(b)) return "border-indigo-200 bg-indigo-50 text-indigo-900";
  if (/\bhp\b|hewlett|packard/.test(b))
    return "border-sky-200 bg-sky-50 text-sky-900";
  if (/lenovo/.test(b))
    return "border-orange-200 bg-orange-50 text-orange-900";
  if (/acer/.test(b)) return "border-lime-200 bg-lime-50 text-lime-900";
  if (/asus/.test(b)) return "border-violet-200 bg-violet-50 text-violet-900";
  if (/samsung/.test(b)) return "border-blue-200 bg-blue-50 text-blue-900";
  if (/\bmsi\b/.test(b)) return "border-rose-200 bg-rose-50 text-rose-900";
  if (/toshiba/.test(b)) return "border-amber-200 bg-amber-50 text-amber-900";
  if (/huawei/.test(b)) return "border-red-200 bg-red-50 text-red-900";
  if (/^lg$|lg electronics/.test(b))
    return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900";
  if (/microsoft|surface/.test(b))
    return "border-purple-200 bg-purple-50 text-purple-900";
  const BRAND_PALETTE = [
    "border-teal-200 bg-teal-50 text-teal-900",
    "border-cyan-200 bg-cyan-50 text-cyan-900",
    "border-emerald-200 bg-emerald-50 text-emerald-900",
    "border-blue-200 bg-blue-50 text-blue-900",
    "border-indigo-200 bg-indigo-50 text-indigo-900",
    "border-violet-200 bg-violet-50 text-violet-900",
    "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900",
    "border-rose-200 bg-rose-50 text-rose-900",
    "border-amber-200 bg-amber-50 text-amber-900",
    "border-lime-200 bg-lime-50 text-lime-900",
  ];
  const idx = strHash(b || "brand") % BRAND_PALETTE.length;
  return BRAND_PALETTE[idx];
}

function initials(fullname?: string | null) {
  if (!fullname) return "—";
  const parts = fullname.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

/* ====== chips cuenta ====== */
function accountBadge(a?: AccountType) {
  const v = (a ?? "").toString().toLowerCase();
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border";
  if (v === "google")
    return (
      <span className={`${base} border-emerald-200 bg-emerald-50 text-emerald-800`}>
        Google
      </span>
    );
  if (v === "microsoft")
    return (
      <span className={`${base} border-sky-200 bg-sky-50 text-sky-800`}>
        Microsoft
      </span>
    );
  if (v === "manual")
    return (
      <span className={`${base} border-slate-200 bg-slate-50 text-slate-800`}>
        Manual
      </span>
    );
  if (!v)
    return (
      <span className={`${base} border-gray-200 bg-gray-50 text-gray-700`}>
        —
      </span>
    );
  return (
    <span className={`${base} border-violet-200 bg-violet-50 text-violet-800`}>
      {v[0].toUpperCase() + v.slice(1)}
    </span>
  );
}

/* ====== resumen licencias ====== */
function summarizeLicenses(lics?: MsLicense[]) {
  if (!lics || lics.length === 0) return [];
  const map = new Map<string, { label: string; count: number }>();
  for (const l of lics) {
    const label =
      (l.licenseType || l.displayName || l.skuPartNumber) +
      (l.licenseTier ? ` ${l.licenseTier}` : "");
    const key = label.toLowerCase();
    map.set(key, { label, count: (map.get(key)?.count ?? 0) + 1 });
  }
  return Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "es")
  );
}

const InfoRow: React.FC<{ label: string; value?: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="grid grid-cols-3 gap-3 py-2 border-b border-neutral-100 last:border-0">
    <div className="text-xs uppercase tracking-wide text-neutral-500">
      {label}
    </div>
    <div className="col-span-2 text-neutral-900">{value ?? "—"}</div>
  </div>
);

/* ================= Componente ================= */
const SolicitanteDetailModal: React.FC<DetailModalProps> = ({
  open,
  onClose,
  solicitante,
}) => {
  const [showLicDetail, setShowLicDetail] = useState(false);

  // Cerrar con ESC
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
    },
    [open, onClose]
  );

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  /* 👇 Hooks que dependen de props/estado deben ir ANTES del early-return */
  const licSummary = useMemo(
    () => summarizeLicenses(solicitante?.msLicenses),
    [solicitante?.msLicenses]
  );

  // ✅ ahora sí, guard
  if (!open || !solicitante) return null;

  const empresa = solicitante.empresa;
  const equipos = solicitante.equipos ?? [];

  const msCount =
    (solicitante.msLicenses?.length ?? 0) ||
    (typeof solicitante.msLicensesCount === "number"
      ? solicitante.msLicensesCount
      : 0);

  const copy = (txt?: string | null) => {
    if (!txt) return;
    try {
      navigator.clipboard?.writeText(txt);
    } catch {
      /* noop */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="solicitante-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full sm:max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl border border-cyan-100 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-cyan-600 via-cyan-700 to-cyan-800 px-5 sm:px-7 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-12 w-12 rounded-2xl bg-white/15 ring-2 ring-white/30 flex items-center justify-center text-white font-bold">
                {initials(solicitante.nombre)}
              </div>
              <div className="text-white min-w-0">
                <h2
                  id="solicitante-modal-title"
                  className="text-lg font-semibold leading-none truncate"
                >
                  {solicitante.nombre}
                </h2>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {accountBadge(solicitante.accountType)}
                  {empresa?.nombre && (
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border bg-white/10 border-white/30"
                      }
                    >
                      {empresa.nombre}
                    </span>
                  )}
                  {msCount > 0 && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border bg-white/10 border-white/30">
                      {msCount} licencia{msCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <CloseOutlined />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-7 py-6 max-h-[75vh] overflow-auto">
          {/* Información general */}
          <section className="mb-6">
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">
              Información general
            </h3>
            <div className="rounded-2xl border border-neutral-200 p-4 bg-neutral-50/50">
              <InfoRow label="ID" value={solicitante.id_solicitante} />
              <InfoRow
                label="Nombre"
                value={
                  <div className="flex items-center gap-2">
                    <span>{solicitante.nombre}</span>
                    <button
                      onClick={() => copy(solicitante.nombre)}
                      className="text-neutral-500 hover:text-neutral-700"
                      title="Copiar nombre"
                      aria-label="Copiar nombre"
                    >
                      <CopyOutlined />
                    </button>
                  </div>
                }
              />
              <InfoRow
                label="Empresa"
                value={
                  empresa?.nombre ? (
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border " +
                        companyTagClasses(empresa)
                      }
                    >
                      {empresa.nombre}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />

              {/* NUEVO: Tipo de cuenta */}
              <InfoRow label="Cuenta" value={accountBadge(solicitante.accountType)} />

              {/* NUEVO: Licencias Microsoft (resumen + detalle) */}
              <InfoRow
                label="Licencias MS"
                value={
                  msCount > 0 ? (
                    <div className="flex flex-col gap-2">
                      {/* Resumen */}
                      <div className="flex flex-wrap gap-1.5">
                        {licSummary.map((it) => (
                          <span
                            key={it.label}
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border border-sky-200 bg-sky-50 text-sky-800"
                            title={it.label}
                          >
                            {it.label} ×{it.count}
                          </span>
                        ))}
                      </div>

                      {/* Toggle detalle */}
                      {solicitante.msLicenses && solicitante.msLicenses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowLicDetail((v) => !v)}
                          className="self-start text-xs text-cyan-700 hover:underline inline-flex items-center gap-1"
                        >
                          {showLicDetail ? <UpOutlined /> : <DownOutlined />}
                          {showLicDetail ? "Ocultar detalle" : "Ver detalle"}
                        </button>
                      )}

                      {/* Detalle */}
                      {showLicDetail && solicitante.msLicenses && (
                        <div className="rounded-lg border border-sky-100 bg-sky-50/50 p-2">
                          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-800">
                            {solicitante.msLicenses.map((l, i) => {
                              const main =
                                l.displayName ||
                                [l.licenseType, l.licenseTier].filter(Boolean).join(" ");
                              return (
                                <li key={`${l.skuId}-${i}`}>
                                  <span className="font-medium">
                                    {main || l.skuPartNumber}
                                  </span>
                                  {main && l.skuPartNumber && (
                                    <span className="text-slate-500">
                                      {" "}
                                      — {l.skuPartNumber}
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    "—"
                  )
                }
              />

              {/* Equipos count chip */}
              <InfoRow
                label="Equipos"
                value={
                  <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50/70 text-cyan-900 px-2.5 py-0.5 text-xs font-medium">
                    {equipos.length} asignado{equipos.length === 1 ? "" : "s"}
                  </span>
                }
              />
            </div>
          </section>

          {/* Equipos */}
          <section>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">Equipos</h3>

            {equipos.length === 0 ? (
              <div className="text-neutral-500 text-sm">No hay equipos asociados.</div>
            ) : (
              <div className="grid gap-4">
                {equipos.map((eq) => (
                  <div
                    key={eq.id_equipo}
                    className="rounded-2xl border border-neutral-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Encabezado del equipo */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-neutral-50">
                      <div className="flex items-center gap-2">
                        <LaptopOutlined className="text-cyan-700" />
                        <div className="font-medium text-neutral-900">
                          {eq.marca ?? "Equipo"} {eq.modelo ? `• ${eq.modelo}` : ""}
                        </div>
                      </div>
                      <span
                        className={
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border " +
                          brandTagClasses(eq.marca)
                        }
                      >
                        {eq.marca ?? "—"}
                      </span>
                    </div>

                    {/* Detalle del equipo */}
                    <div className="px-4 py-3 grid gap-2 sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-sm">
                        <TagOutlined className="text-neutral-500" />
                        <span className="text-neutral-600">
                          Modelo: <span className="text-neutral-900">{eq.modelo ?? "—"}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <BarcodeOutlined className="text-neutral-500" />
                        <span className="text-neutral-600">
                          Serial: <span className="text-neutral-900">{eq.serial ?? "—"}</span>
                        </span>
                        {eq.serial && (
                          <button
                            onClick={() => copy(eq.serial!)}
                            className="ml-1 text-neutral-500 hover:text-neutral-700"
                            title="Copiar serial"
                            aria-label="Copiar serial"
                          >
                            <CopyOutlined />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <InfoCircleOutlined className="text-neutral-500" />
                        <span className="text-neutral-600">
                          Procesador: <span className="text-neutral-900">{eq.procesador ?? "—"}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DatabaseOutlined className="text-neutral-500" />
                        <span className="text-neutral-600">
                          RAM: <span className="text-neutral-900">{eq.ram ?? "—"}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <HddOutlined className="text-neutral-500" />
                        <span className="text-neutral-600">
                          Disco: <span className="text-neutral-900">{eq.disco ?? "—"}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <InfoCircleOutlined className="text-neutral-500" />
                        <span className="text-neutral-600">
                          Propiedad: <span className="text-neutral-900">{eq.propiedad ?? "—"}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-7 py-4 border-t border-neutral-200 bg-neutral-50 flex justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-300 text-cyan-800 px-4 py-2 text-sm hover:bg-cyan-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SolicitanteDetailModal;
