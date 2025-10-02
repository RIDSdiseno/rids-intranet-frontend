// src/components/VisitaDetailModal.tsx
import React, { useEffect, useCallback } from "react";
import {
  CloseOutlined,
  UserOutlined,
  TeamOutlined,
  FieldTimeOutlined,
  CheckCircleTwoTone,
  InfoCircleOutlined,
} from "@ant-design/icons";

export type VisitaEmpresa = { id_empresa: number; nombre: string };
export type VisitaTecnico = { id_tecnico: number; nombre: string };

export type VisitaDetail = {
  id_visita: number;
  empresaId: number;
  tecnicoId: number;
  solicitante: string;
  // realizado: string;     // ❌ eliminado del tipo
  otrosDetalle: string | null; // ✅ reemplazo
  inicio: string; // ISO
  fin: string | null;

  /* Configuraciones clásicas */
  confImpresoras: boolean;
  confTelefonos: boolean;
  confPiePagina: boolean;
  otros: boolean;

  /* Checklist técnico nuevo (opcionales para tolerancia) */
  actualizaciones?: boolean;
  antivirus?: boolean;
  ccleaner?: boolean;
  estadoDisco?: boolean;
  licenciaOffice?: boolean;
  licenciaWindows?: boolean;
  mantenimientoReloj?: boolean;
  rendimientoEquipo?: boolean;

  status: string;
  empresa?: VisitaEmpresa | null;
  tecnico?: VisitaTecnico | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  visita: VisitaDetail | null;
};

/* ================= Helpers ================= */
const PALETTE = [
  "cyan", "sky", "emerald", "teal", "blue", "violet", "fuchsia", "rose", "orange", "amber",
] as const;

function hashIndex(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % PALETTE.length;
}
function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CL");
  } catch {
    return iso ?? "—";
  }
}
function statusStyles(statusRaw?: string) {
  const s = (statusRaw ?? "").toUpperCase();
  if (s.includes("COMPLE"))   return "bg-emerald-50 text-emerald-800 border border-emerald-200";
  if (s.includes("PROGRE"))   return "bg-sky-50 text-sky-800 border border-sky-200";
  if (s.includes("PEND"))     return "bg-amber-50 text-amber-800 border border-amber-200";
  if (s.includes("CANCEL"))   return "bg-rose-50 text-rose-800 border border-rose-200";
  return "bg-neutral-50 text-neutral-700 border border-neutral-200";
}

const Chip: React.FC<{
  label: string;
  subtitle?: string;
  colorKey?: string;
  leadingIcon?: React.ReactNode;
}> = ({ label, subtitle, colorKey = "", leadingIcon }) => {
  const idx = hashIndex(colorKey || label);
  const tone = PALETTE[idx];
  const ring = `ring-${tone}-200`;
  const bg = `bg-${tone}-50`;
  const text = `text-${tone}-800`;
  const safe = "ring-1 bg-opacity-70 text-opacity-100"; // fallback seguro
  return (
    <span
      className={[
        "inline-flex items-center gap-2 px-3 py-1 rounded-full",
        "ring-1", safe, ring, bg, text,
      ].join(" ")}
      title={subtitle ?? label}
    >
      <span
        className={[
          "inline-flex items-center justify-center h-6 w-6 rounded-full",
          "bg-white/80 ring-1 ring-white/60",
          text,
        ].join(" ")}
        aria-hidden
      >
        {leadingIcon ?? initials(label)}
      </span>
      <span className="text-sm font-medium">{label}</span>
      {subtitle ? (
        <span className="text-xs opacity-70 max-w-[160px] truncate">{subtitle}</span>
      ) : null}
    </span>
  );
};

const Row: React.FC<{ label: string; children?: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-3 gap-3 py-2 border-b border-neutral-100 last:border-0">
    <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
    <div className="col-span-2 text-neutral-900">{children ?? "—"}</div>
  </div>
);

/* ================= Component ================= */
const VisitaDetailModal: React.FC<Props> = ({ open, onClose, visita }) => {
  const escHandler = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
    },
    [open, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", escHandler);
    return () => document.removeEventListener("keydown", escHandler);
  }, [escHandler]);

  if (!open || !visita) return null;

  const empresaName = visita.empresa?.nombre ?? `#${visita.empresaId}`;
  const tecnicoName = visita.tecnico?.nombre ?? `#${visita.tecnicoId}`;

  const BoolRow: React.FC<{ ok?: boolean; label: string }> = ({ ok, label }) => (
    <div className="flex items-center gap-2 text-sm">
      <CheckCircleTwoTone twoToneColor={ok ? "#10b981" : "#94a3b8"} />
      <span className={ok ? "text-emerald-700" : "text-neutral-600"}>
        {label} {ok ? "sí" : "no"}
      </span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="visita-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />

      {/* Card responsiva: bottom sheet en móvil, centrada en desktop */}
      <div
        className={[
          "relative w-full sm:max-w-3xl bg-white shadow-2xl overflow-hidden",
          "rounded-t-3xl sm:rounded-2xl",
          "h-[88vh] sm:h-auto sm:max-h-[85vh]",
          "flex flex-col",
        ].join(" ")}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Header */}
        <div className="relative px-5 sm:px-6 py-5 bg-gradient-to-r from-cyan-600 to-sky-600 text-white">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/15 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <InfoCircleOutlined className="text-white text-lg" />
              </div>
              <div className="min-w-0">
                <h2 id="visita-modal-title" className="text-base sm:text-lg font-semibold leading-tight truncate">
                  Detalle de visita <span className="opacity-90">#{visita.id_visita}</span>
                </h2>
                <div className="text-[11px] sm:text-xs opacity-80 truncate">
                  {fmtDateTime(visita.inicio)} {visita.fin ? "•" : ""} {visita.fin ? fmtDateTime(visita.fin) : ""}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={[
                  "px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium",
                  statusStyles(visita.status),
                ].join(" ")}
              >
                {visita.status}
              </span>
              <button
                onClick={onClose}
                className="p-2.5 rounded-lg text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <CloseOutlined />
              </button>
            </div>
          </div>
        </div>

        {/* Body con scroll interno */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">
          {/* Chips principales */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Chip
              label={empresaName}
              subtitle="Empresa"
              colorKey={`empresa-${empresaName}`}
              leadingIcon={<TeamOutlined />}
            />
            <Chip
              label={tecnicoName}
              subtitle="Técnico"
              colorKey={`tecnico-${tecnicoName}`}
              leadingIcon={<UserOutlined />}
            />
          </section>

          {/* Información general */}
          <section>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">
              Información general
            </h3>
            <div className="rounded-xl border border-neutral-200 p-4">
              <Row label="Solicitante">
                <span className="inline-flex items-center gap-2">
                  <UserOutlined className="text-cyan-600" />
                  <span className="truncate">{visita.solicitante || "—"}</span>
                </span>
              </Row>
              <Row label="Detalle">
                <div className="whitespace-pre-wrap leading-relaxed break-words">
                  {visita.otrosDetalle || "—"}
                </div>
              </Row>
            </div>
          </section>

          {/* Timeline simple de tiempos */}
          <section>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">Tiempos</h3>
            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-neutral-200" />
              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute -left-[22px] top-0 h-3 w-3 rounded-full bg-cyan-500 ring-4 ring-cyan-100" />
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <FieldTimeOutlined className="text-cyan-600" />
                    <span className="font-medium text-neutral-800">Inicio</span>
                    <span className="text-neutral-600">{fmtDateTime(visita.inicio)}</span>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute -left-[22px] top-0 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <FieldTimeOutlined className="text-emerald-600" />
                    <span className="font-medium text-neutral-800">Fin</span>
                    <span className="text-neutral-600">{fmtDateTime(visita.fin)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Configuraciones realizadas */}
          <section>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">
              Configuraciones realizadas
            </h3>
            <div className="rounded-xl border border-neutral-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <BoolRow ok={visita.confImpresoras} label="Impresoras" />
              <BoolRow ok={visita.confTelefonos} label="Teléfonos" />
              <BoolRow ok={visita.confPiePagina} label="Pie de página" />
              <BoolRow ok={visita.otros} label="Otros" />
            </div>
            {visita.otros && (
              <div className="mt-2 text-sm text-neutral-700 break-words">
                <span className="font-medium">Detalle otros:</span>{" "}
                {visita.otrosDetalle || "—"}
              </div>
            )}
          </section>

          {/* Checklist técnico (nuevo) */}
          <section>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">
              Checklist técnico
            </h3>
            <div className="rounded-xl border border-neutral-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <BoolRow ok={!!visita.actualizaciones} label="Actualizaciones" />
              <BoolRow ok={!!visita.antivirus} label="Antivirus" />
              <BoolRow ok={!!visita.ccleaner} label="CCleaner" />
              <BoolRow ok={!!visita.estadoDisco} label="Estado del disco" />
              <BoolRow ok={!!visita.licenciaOffice} label="Licencia Office" />
              <BoolRow ok={!!visita.licenciaWindows} label="Licencia Windows" />
              <BoolRow ok={!!visita.mantenimientoReloj} label="Mantenimiento del reloj" />
              <BoolRow ok={!!visita.rendimientoEquipo} label="Rendimiento del equipo" />
            </div>
          </section>
        </div>

        {/* Footer fijo dentro de la tarjeta */}
        <div className="px-4 sm:px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm border-cyan-300 text-cyan-800 hover:bg-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <CloseOutlined /> Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default VisitaDetailModal;
