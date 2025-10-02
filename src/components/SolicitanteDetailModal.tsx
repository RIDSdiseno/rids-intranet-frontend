import React, { useCallback, useEffect } from "react";
import {
  CloseOutlined,
  LaptopOutlined,
  HddOutlined,
  DatabaseOutlined,
  TagOutlined,
  BarcodeOutlined,
  InfoCircleOutlined,
  CopyOutlined,
} from "@ant-design/icons";

/** Tipos mínimos que el modal necesita (duplicados aquí para no depender de la página). */
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

export type SolicitanteForDetail = {
  id_solicitante: number;
  nombre: string;
  empresaId: number | null;
  empresa: Empresa;
  equipos: Equipo[];
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

  // marcas conocidas (asigna colores consistentes):
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

  // fallback por hash:
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

const InfoRow: React.FC<{ label: string; value?: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="grid grid-cols-3 gap-3 py-2 border-b border-neutral-100 last:border-0">
    <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
    <div className="col-span-2 text-neutral-900">{value ?? "—"}</div>
  </div>
);

const SolicitanteDetailModal: React.FC<DetailModalProps> = ({
  open,
  onClose,
  solicitante,
}) => {
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

  if (!open || !solicitante) return null;

  const empresa = solicitante.empresa;
  const equipos = solicitante.equipos ?? [];

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
      {/* Backdrop con blur */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full sm:max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl border border-cyan-100 overflow-hidden">
        {/* Header con gradiente y avatar */}
        <div className="relative bg-gradient-to-r from-cyan-600 via-cyan-700 to-cyan-800 px-5 sm:px-7 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/15 ring-2 ring-white/30 flex items-center justify-center text-white font-bold">
                {initials(solicitante.nombre)}
              </div>
              <div className="text-white">
                <h2 id="solicitante-modal-title" className="text-lg font-semibold leading-none">
                  {solicitante.nombre}
                </h2>
                <div className="mt-1">
                  <span
                    className={
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium " +
                      companyTagClasses(empresa)
                    }
                  >
                    <InfoCircleOutlined />
                    {empresa?.nombre ?? "Sin empresa"}
                  </span>
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

        {/* Body scrollable */}
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
                          Serial:{" "}
                          <span className="text-neutral-900">{eq.serial ?? "—"}</span>
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
                          Procesador:{" "}
                          <span className="text-neutral-900">{eq.procesador ?? "—"}</span>
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
                          Propiedad:{" "}
                          <span className="text-neutral-900">{eq.propiedad ?? "—"}</span>
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
