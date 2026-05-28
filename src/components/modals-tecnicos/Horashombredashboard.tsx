// src/host/components/HorasHombreDashboard.tsx
//
// ─── Variables CSS del sistema (index.css) ───────────────────────────────────
//  Superficies : --color-surface  /  --color-surface-2  /  --color-surface-3
//  Fondo base  : --color-bg
//  Bordes      : --color-border   /  --color-border-light
//  Texto       : --color-text-primary  /  --color-text-secondary  /  --color-text-muted
//  Acento      : --color-accent   /  --color-success  /  --color-error
//  Semánticos  : --color-visitas  /  --color-remotas  /  --color-tickets
//
//  ⚠️  NO se usan --color-background-*, --color-border-tertiary ni similares
//      que no existen en el sistema de tokens.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from "react";
import {
  ClockCircleOutlined,
  TeamOutlined,
  BuildOutlined,
  FileDoneOutlined,
  SearchOutlined,
  CloseOutlined,
  PlusOutlined,
  SwapOutlined,
  BarsOutlined,
} from "@ant-design/icons";

/* ====================== Tipos exportados ====================== */
export type HorasMesRow = {
  mes: string;
  visitas: number;
  jornadas?: number;
  remotas: number;
  tickets: number;
  horasVisitas: number;
  horasRemotas: number;
  horasTotal: number;
};

export type HorasTecnicoEmpresaRow = {
  empresaId: number;
  empresa: string;
  tecnicoId: number;
  tecnico: string;
  totalHorasVisitas: number;
  totalHorasRemotas: number;
  totalHorasHombre: number;
  visitas: number;
  jornadas?: number;
  remotas: number;
  tickets: number;
  meses: HorasMesRow[];
};

export type HorasTecnicosDashboardData = {
  periodo: { desde: string; hasta: string };
  kpis: {
    totalHorasVisitas: number;
    totalHorasRemotas: number;
    totalHorasHombre: number;
    totalVisitas?: number;
    totalRemotas: number;
    totalTickets: number;
    tecnicosConActividad: number;
  };
  resumenPorTecnico: Array<{
    tecnicoId: number;
    tecnico: string;
    totalHorasVisitas: number;
    totalHorasRemotas: number;
    totalHorasHombre: number;
    visitas?: number;
    jornadas?: number;
    remotas: number;
    tickets: number;
  }>;
  porTecnicoEmpresa: HorasTecnicoEmpresaRow[];
};

/* ====================== Token alias ====================== */
// Un solo lugar donde mapear los nombres cortos a las variables reales.
// Si cambia el token en index.css, solo hay que actualizar aquí.
const T = {
  surface: "var(--color-surface)",
  surface2: "var(--color-surface-2)",
  surface3: "var(--color-surface-3)",
  bg: "var(--color-bg)",
  border: "var(--color-border)",
  borderLight: "var(--color-border-light)",
  text: "var(--color-text-primary)",
  textSub: "var(--color-text-secondary)",
  textMuted: "var(--color-text-muted)",
  accent: "var(--color-accent)",
  success: "var(--color-success)",
  error: "var(--color-error)",
  visitas: "var(--color-visitas)",
  remotas: "var(--color-remotas)",
};

/* ====================== Helpers ====================== */
function fmtH(v?: number | null) {
  return Number(v ?? 0).toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
function fmtInt(v?: number | null) {
  return Number(v ?? 0).toLocaleString("es-CL");
}
function formatMesLabel(mes: string) {
  const [y, m] = mes.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  if (isNaN(d.getTime())) return mes;
  return d.toLocaleDateString("es-CL", { month: "short", year: "2-digit" });
}
function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

// Paleta de avatares oscura → funciona en ambos temas
const AVATAR_PALETTE: [string, string][] = [
  ["#1e3a5f", "#93c5fd"],
  ["#064e3b", "#6ee7b7"],
  ["#3b1d8c", "#c4b5fd"],
  ["#7c1d2a", "#fda4af"],
  ["#78350f", "#fcd34d"],
  ["#4a1a42", "#f0abfc"],
  ["#1c4a3a", "#6ee7b7"],
  ["#2d2a4a", "#a5b4fc"],
];
function avatarColor(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

// Paleta de empresas: colores con contraste suficiente en claro Y oscuro
const EMPRESA_COLORS = [
  { accent: "#0891b2", chipBg: "#164e63", chipText: "#67e8f9" }, // cyan
  { accent: "#059669", chipBg: "#064e3b", chipText: "#6ee7b7" }, // emerald
  { accent: "#7c3aed", chipBg: "#3b1d8c", chipText: "#c4b5fd" }, // violet
  { accent: "#d97706", chipBg: "#78350f", chipText: "#fcd34d" }, // amber
];

/* ====================== Barra horizontal ====================== */
const HBar: React.FC<{ pct: number; color: string; h?: number }> = ({ pct, color, h = 5 }) => (
  <div style={{ background: T.surface3, borderRadius: 99, overflow: "hidden", height: h, width: "100%" }}>
    <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, Math.round(pct)))}%`, background: color, borderRadius: 99, transition: "width .4s ease" }} />
  </div>
);

/* ====================== KPI mini card ====================== */
const KpiCard: React.FC<{ label: string; value: string; sub?: string; icon: React.ReactNode; color: string }> = ({ label, value, sub, icon, color }) => (
  <div style={{ background: T.surface2, borderRadius: 10, padding: "10px 14px", border: `0.5px solid ${T.border}` }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ color, fontSize: 14 }}>{icon}</span>
    </div>
    <div style={{ fontSize: 22, fontWeight: 500, color: T.text, lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{sub}</div>}
  </div>
);

/* ====================== Sparkline SVG ====================== */
const Sparkline: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  if (values.length < 2) return null;
  const w = 80; const h = 24;
  const max = Math.max(...values, 0.01);
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 4) - 2).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
};

/* ====================== Modal selector de empresas ====================== */
const EmpresaPickerModal: React.FC<{
  empresas: Array<{ id: number; nombre: string; totalHH: number }>;
  selected: number[];
  maxSelect: number;
  onToggle: (id: number) => void;
  onClose: () => void;
  search: string;
  onSearchChange: (v: string) => void;
}> = ({ empresas, selected, maxSelect, onToggle, onClose, search, onSearchChange }) => {
  const filtered = empresas.filter((e) => !search.trim() || e.nombre.toLowerCase().includes(search.toLowerCase()));
  const maxHH = Math.max(...empresas.map((e) => e.totalHH), 0.01);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Seleccionar empresas a comparar"
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15,23,42,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      {/* Panel */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(760px, 100%)",
          maxHeight: "82vh",
          background: T.surface,
          borderRadius: 16,
          border: `1px solid ${T.border}`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, background: T.surface, flexShrink: 0 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: T.text }}>
              Seleccionar empresas a comparar
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textSub }}>
              Elige hasta {maxSelect} empresas · {selected.length} seleccionada{selected.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 18, color: T.textMuted, padding: 4, lineHeight: 1, flexShrink: 0 }}
          >
            <CloseOutlined />
          </button>
        </div>

        {/* Búsqueda */}
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0 }}>
          <div style={{ position: "relative" }}>
            <SearchOutlined style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.textMuted, fontSize: 14 }} />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar empresa..."
              autoFocus
              style={{
                width: "100%",
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: "9px 12px 9px 36px",
                outline: "none",
                fontSize: 14,
                color: T.text,
                background: T.surface2,
              }}
            />
          </div>
        </div>

        {/* Lista de empresas — grid cards */}
        <div style={{ padding: 16, overflowY: "auto", flex: 1, background: T.bg }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: T.textMuted, fontSize: 14 }}>
              No se encontraron empresas.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {filtered.map((empresa) => {
                const checked = selected.includes(empresa.id);
                const disabled = !checked && selected.length >= maxSelect;
                const pct = (empresa.totalHH / maxHH) * 100;
                const colorIdx = selected.indexOf(empresa.id);
                const ec = colorIdx >= 0 ? EMPRESA_COLORS[colorIdx] : null;

                return (
                  <button
                    key={empresa.id}
                    type="button"
                    onClick={() => { if (!disabled) onToggle(empresa.id); }}
                    disabled={disabled}
                    style={{
                      textAlign: "left",
                      border: checked ? `2px solid ${ec?.accent ?? T.accent}` : `1px solid ${T.border}`,
                      background: checked ? T.surface2 : T.surface,
                      borderRadius: 12,
                      padding: 12,
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.4 : 1,
                      transition: "all .15s ease",
                    }}
                  >
                    {/* Nombre + radio */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontWeight: 600, color: T.text, fontSize: 13, lineHeight: 1.3 }}>
                        {empresa.nombre}
                      </span>
                      <span
                        style={{
                          width: 16, height: 16, borderRadius: 999, flexShrink: 0, marginTop: 1,
                          border: checked ? `5px solid ${ec?.accent ?? T.accent}` : `1.5px solid ${T.border}`,
                          background: T.surface,
                        }}
                      />
                    </div>

                    {/* Horas */}
                    <div style={{ marginTop: 6, fontSize: 12, color: checked ? (ec?.accent ?? T.accent) : T.textSub, fontWeight: checked ? 600 : 400 }}>
                      {fmtH(empresa.totalHH)} h
                    </div>

                    {/* Barra */}
                    <div style={{ marginTop: 8 }}>
                      <HBar pct={pct} color={checked ? (ec?.accent ?? T.accent) : T.surface3} h={4} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: T.surface2, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: T.textSub }}>
            {selected.length} de {maxSelect} seleccionadas
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ border: `1px solid ${T.border}`, background: T.surface, color: T.text, borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={selected.length === 0}
              style={{
                border: "none",
                background: selected.length === 0 ? T.surface3 : T.accent,
                color: "#fff",
                borderRadius: 10,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 700,
                cursor: selected.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              Comparar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ====================== Columna empresa en comparativa ====================== */
const EmpresaColumn: React.FC<{
  empresa: { id: number; nombre: string; totalHH: number };
  tecnicoRows: Array<HorasTecnicoEmpresaRow & { rank: number }>;
  colorScheme: (typeof EMPRESA_COLORS)[number];
  maxHH: number;
  onRemove: () => void;
}> = ({ empresa, tecnicoRows, colorScheme, maxHH, onRemove }) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const totalV = tecnicoRows.reduce((s, r) => s + r.totalHorasVisitas, 0);
  const totalR = tecnicoRows.reduce((s, r) => s + r.totalHorasRemotas, 0);

  return (
    <div style={{ width: "100%", height: "100%", background: T.surface, border: `2px solid ${colorScheme.accent}44`, borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,.08)" }}>

      {/* Header */}
      <div style={{ background: T.surface2, padding: "12px 14px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={empresa.nombre}>
              {empresa.nombre}
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
              {tecnicoRows.length} técnico{tecnicoRows.length !== 1 ? "s" : ""}
            </div>
          </div>
          {/* Dot de color */}
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: colorScheme.accent, flexShrink: 0, marginTop: 3 }} />
          <button type="button" onClick={onRemove} title="Quitar empresa" style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 13, padding: 2, flexShrink: 0 }}>
            <CloseOutlined />
          </button>
        </div>

        {/* Total H.H. */}
        <div style={{ fontSize: 26, fontWeight: 500, color: colorScheme.accent, lineHeight: 1, marginBottom: 8 }}>
          {fmtH(empresa.totalHH)} h
        </div>

        {/* Desglose */}
        {[{ label: "Visitas", val: totalV }, { label: "Remotas", val: totalR }].map(({ label, val }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: T.textSub, width: 52, flexShrink: 0 }}>{label}</span>
            <HBar pct={empresa.totalHH > 0 ? (val / empresa.totalHH) * 100 : 0} color={colorScheme.accent} h={4} />
            <span style={{ fontSize: 11, fontWeight: 500, color: colorScheme.accent, width: 46, textAlign: "right", flexShrink: 0 }}>
              {fmtH(val)} h
            </span>
          </div>
        ))}
      </div>

      {/* Ranking técnicos */}
      <div>
        {tecnicoRows.length === 0 && (
          <div style={{ padding: "20px 14px", textAlign: "center", fontSize: 12, color: T.textMuted }}>
            Sin actividad en este período.
          </div>
        )}
        {tecnicoRows.map((row, idx) => {
          const [avBg, avFg] = avatarColor(row.tecnico);
          const pct = empresa.totalHH > 0 ? (row.totalHorasHombre / empresa.totalHH) * 100 : 0;
          const mesVals = [...row.meses].sort((a, b) => a.mes.localeCompare(b.mes)).map((m) => m.horasTotal);
          const isOpen = expanded === row.tecnicoId;

          return (
            <div key={row.tecnicoId} style={{ borderBottom: `0.5px solid ${T.borderLight}`, background: idx % 2 === 0 ? T.surface : T.surface2 }}>
              <button type="button" onClick={() => setExpanded(isOpen ? null : row.tecnicoId)} style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  {/* Rank */}
                  <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, background: idx === 0 ? colorScheme.accent : T.surface3, color: idx === 0 ? "#fff" : T.textMuted, fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${idx === 0 ? colorScheme.accent : T.border}` }}>
                    {idx + 1}
                  </div>
                  {/* Avatar */}
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: avBg, color: avFg, fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {initials(row.tecnico)}
                  </div>
                  {/* Nombre */}
                  <span style={{ flex: 1, fontSize: 12, fontWeight: idx === 0 ? 600 : 400, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.tecnico}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: colorScheme.accent, flexShrink: 0 }}>
                    {fmtH(row.totalHorasHombre)} h
                  </span>
                  <span style={{ fontSize: 10, color: T.textMuted, display: "inline-block", transition: "transform .2s", transform: isOpen ? "rotate(180deg)" : "none" }}>▾</span>
                </div>
                <div style={{ paddingLeft: 52 }}>
                  <HBar pct={pct} color={colorScheme.accent} h={4} />
                </div>
              </button>

              {isOpen && (
                <div style={{ padding: "0 14px 12px", background: T.surface2, borderTop: `0.5px solid ${T.border}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, paddingTop: 10, marginBottom: 10 }}>
                    {[
                      { label: "H. visitas", val: `${fmtH(row.totalHorasVisitas)} h` },
                      { label: "H. remotas", val: `${fmtH(row.totalHorasRemotas)} h` },
                      { label: "Tickets", val: fmtInt(row.tickets) },
                    ].map((k) => (
                      <div key={k.label} style={{ background: T.surface3, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 2 }}>{k.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: colorScheme.accent }}>{k.val}</div>
                      </div>
                    ))}
                  </div>
                  {mesVals.some((v) => v > 0) && (
                    <div>
                      <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tendencia mensual</div>
                      <Sparkline values={mesVals} color={colorScheme.accent} />
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 8px", marginTop: 4 }}>
                        {[...row.meses].filter((m) => m.horasTotal > 0).sort((a, b) => a.mes.localeCompare(b.mes)).map((m) => (
                          <span key={m.mes} style={{ fontSize: 11, color: T.textSub }}>
                            {formatMesLabel(m.mes)}: <strong style={{ color: T.text }}>{fmtH(m.horasTotal)} h</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ====================== Vista general ====================== */
const VistaGeneral: React.FC<{
  data: HorasTecnicosDashboardData;
  empresasDisponibles: Array<{ id: number; nombre: string; totalHH: number }>;
  onAbrirComparar: () => void;
}> = ({ data, empresasDisponibles, onAbrirComparar }) => {
  const resumen = useMemo(() => [...data.resumenPorTecnico].sort((a, b) => b.totalHorasHombre - a.totalHorasHombre), [data]);
  const maxHH = Math.max(...resumen.map((r) => r.totalHorasHombre), 0.01);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Banner CTA */}
      <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>Vista general del período</div>
          <div style={{ fontSize: 12, color: T.textSub }}>
            {empresasDisponibles.length} empresa{empresasDisponibles.length !== 1 ? "s" : ""} con actividad ·{" "}
            {data.kpis.tecnicosConActividad} técnico{data.kpis.tecnicosConActividad !== 1 ? "s" : ""} activos
          </div>
        </div>
        <button
          type="button"
          onClick={onAbrirComparar}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: T.accent, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          <SwapOutlined style={{ fontSize: 13 }} />
          Comparar empresas
        </button>
      </div>

      {/* Ranking */}
      <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `0.5px solid ${T.border}`, background: T.surface2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Ranking general de técnicos</span>
            <span style={{ fontSize: 11, color: T.textMuted, display: "block", marginTop: 1 }}>Acumulado de todas las empresas</span>
          </div>
          <span style={{ fontSize: 11, background: T.surface3, color: T.textSub, padding: "3px 8px", borderRadius: 99, fontWeight: 500 }}>
            {fmtInt(data.kpis.tecnicosConActividad)} técnicos
          </span>
        </div>

        {/* Mobile */}
        <div className="block lg:hidden">
          {resumen.map((row, i) => {
            const [avBg, avFg] = avatarColor(row.tecnico);
            return (
              <div key={row.tecnicoId} style={{ padding: "12px 16px", borderBottom: `0.5px solid ${T.borderLight}`, background: i % 2 === 0 ? T.surface : T.surface2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: i < 3 ? T.accent : T.surface3, color: i < 3 ? "#fff" : T.textMuted, fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: avBg, color: avFg, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials(row.tecnico)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{row.tecnico}</div>
                    <div style={{ fontSize: 11, color: T.textMuted }}>{fmtInt(row.visitas ?? row.jornadas ?? 0)} vis · {fmtInt(row.remotas)} rem · {fmtInt(row.tickets)} tickets</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: T.accent }}>{fmtH(row.totalHorasHombre)} h</div>
                    <div style={{ fontSize: 11, color: T.textMuted }}>total</div>
                  </div>
                </div>
                <HBar pct={(row.totalHorasHombre / maxHH) * 100} color={T.accent} h={4} />
              </div>
            );
          })}
        </div>

        {/* Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `0.5px solid ${T.border}`, background: T.surface2 }}>
                {["#", "Técnico", "H. visitas", "H. remotas", "Total H.H.", "Distribución", "Visitas", "Tickets"].map((h, i) => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: i >= 2 && i !== 5 ? "right" : "left", fontSize: 11, color: T.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", width: h === "Distribución" ? 160 : h === "#" ? 32 : "auto" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resumen.map((row, i) => {
                const [avBg, avFg] = avatarColor(row.tecnico);
                return (
                  <tr key={row.tecnicoId} style={{ borderBottom: `0.5px solid ${T.borderLight}`, background: i % 2 === 0 ? T.surface : T.surface2 }}>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: i < 3 ? T.accent : T.surface3, color: i < 3 ? "#fff" : T.textMuted, fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</div>
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: avBg, color: avFg, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials(row.tecnico)}</div>
                        <span style={{ fontWeight: 500, color: T.text }}>{row.tecnico}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "right", color: T.visitas, fontVariantNumeric: "tabular-nums" }}>{fmtH(row.totalHorasVisitas)} h</td>
                    <td style={{ padding: "10px 16px", textAlign: "right", color: T.remotas, fontVariantNumeric: "tabular-nums" }}>{fmtH(row.totalHorasRemotas)} h</td>
                    <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: T.text, fontVariantNumeric: "tabular-nums" }}>{fmtH(row.totalHorasHombre)} h</td>
                    <td style={{ padding: "10px 16px" }}><HBar pct={(row.totalHorasHombre / maxHH) * 100} color={T.accent} h={5} /></td>
                    <td style={{ padding: "10px 16px", textAlign: "right", color: T.textSub, fontVariantNumeric: "tabular-nums" }}>{fmtInt(row.visitas ?? row.jornadas ?? 0)}</td>
                    <td style={{ padding: "10px 16px", textAlign: "right", color: T.textSub, fontVariantNumeric: "tabular-nums" }}>{fmtInt(row.tickets)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ====================== Dashboard principal ====================== */
const HorasHombreDashboard: React.FC<{
  data: HorasTecnicosDashboardData | null;
  loading: boolean;
  error: string | null;
}> = ({ data, loading, error }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [empresasSeleccionadas, setEmpresasSeleccionadas] = useState<number[]>([]);
  const [modalSearch, setModalSearch] = useState("");
  const MAX_EMPRESAS = 4;

  const empresasDisponibles = useMemo(() => {
    if (!data) return [];
    const map = new Map<number, { id: number; nombre: string; totalHH: number }>();
    data.porTecnicoEmpresa.forEach((row) => {
      if (!map.has(row.empresaId)) map.set(row.empresaId, { id: row.empresaId, nombre: row.empresa, totalHH: 0 });
      map.get(row.empresaId)!.totalHH += row.totalHorasHombre;
    });
    return [...map.values()].sort((a, b) => b.totalHH - a.totalHH);
  }, [data]);

  const columnasPorEmpresa = useMemo(() => {
    if (!data) return [];
    return empresasSeleccionadas
      .map((empId) => {
        const empresa = empresasDisponibles.find((e) => e.id === empId);
        if (!empresa) return null;
        const rows = data.porTecnicoEmpresa
          .filter((r) => r.empresaId === empId)
          .sort((a, b) => b.totalHorasHombre - a.totalHorasHombre)
          .map((r, i) => ({ ...r, rank: i + 1 }));
        return { empresa, rows };
      })
      .filter(Boolean) as Array<{ empresa: { id: number; nombre: string; totalHH: number }; rows: Array<HorasTecnicoEmpresaRow & { rank: number }> }>;
  }, [data, empresasSeleccionadas, empresasDisponibles]);

  const toggleEmpresa = (id: number) =>
    setEmpresasSeleccionadas((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, MAX_EMPRESAS));
  const removerEmpresa = (id: number) =>
    setEmpresasSeleccionadas((prev) => prev.filter((x) => x !== id));

  /* Estados */
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse" style={{ height: i === 0 ? 80 : 120, borderRadius: 12, background: T.surface2 }} />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ border: `0.5px solid ${T.error}`, background: T.surface, borderRadius: 12, padding: 24, textAlign: "center", color: T.error, fontSize: 14 }}>
        {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div style={{ border: `0.5px solid ${T.border}`, borderRadius: 12, padding: "48px 24px", textAlign: "center", color: T.textMuted, fontSize: 14 }}>
        <ClockCircleOutlined style={{ fontSize: 32, display: "block", margin: "0 auto 12px" }} />
        Sin datos para el período seleccionado.
      </div>
    );
  }

  const modoComparacion = empresasSeleccionadas.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
        <KpiCard label="Total H.H." value={`${fmtH(data.kpis.totalHorasHombre)} h`} sub="Visitas + remotas" icon={<ClockCircleOutlined />} color={T.accent} />
        <KpiCard label="H. visitas" value={`${fmtH(data.kpis.totalHorasVisitas)} h`} sub="Registros completados" icon={<TeamOutlined />} color={T.visitas} />
        <KpiCard label="H. remotas" value={`${fmtH(data.kpis.totalHorasRemotas)} h`} sub="Mantenciones remotas" icon={<BuildOutlined />} color={T.remotas} />
        <KpiCard label="Tickets" value={fmtInt(data.kpis.totalTickets)} sub="No suman horas" icon={<FileDoneOutlined />} color={T.textSub} />
        <KpiCard label="Técnicos" value={String(data.kpis.tecnicosConActividad)} sub="Con actividad" icon={<TeamOutlined />} color={T.success} />
      </div>

      {/* ── MODO COMPARACIÓN ── */}
      {modoComparacion && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Toolbar */}
          <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, position: "sticky", top: 0, zIndex: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Comparando:</span>

            {columnasPorEmpresa.map((col, i) => {
              const ec = EMPRESA_COLORS[i % EMPRESA_COLORS.length];
              return (
                <span key={col.empresa.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 99, background: T.surface2, color: T.textSub, fontSize: 12, fontWeight: 500, border: `1.5px solid ${ec.accent}` }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: ec.accent, flexShrink: 0 }} />
                  {col.empresa.nombre}
                  <button type="button" onClick={() => removerEmpresa(col.empresa.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 11, padding: 0, lineHeight: 1 }}>✕</button>
                </span>
              );
            })}

            {empresasSeleccionadas.length < MAX_EMPRESAS && (
              <button type="button" onClick={() => setModalOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 99, background: "transparent", color: T.textMuted, border: `0.5px dashed ${T.border}`, fontSize: 12, cursor: "pointer" }}>
                <PlusOutlined style={{ fontSize: 11 }} /> Agregar
              </button>
            )}

            <button type="button" onClick={() => setEmpresasSeleccionadas([])} style={{ marginLeft: "auto", fontSize: 12, color: T.textMuted, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <BarsOutlined style={{ fontSize: 12 }} /> Vista general
            </button>
          </div>

          {/* Columnas — scroll horizontal en mobile */}
          <div style={{ width: "100%", overflowX: "auto", paddingBottom: 8 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "stretch", minWidth: "max-content" }}>
              {columnasPorEmpresa.map((col, i) => (
                <div key={col.empresa.id} style={{ flex: "0 0 360px", width: 360 }}>
                  <EmpresaColumn
                    empresa={col.empresa}
                    tecnicoRows={col.rows}
                    colorScheme={EMPRESA_COLORS[i % EMPRESA_COLORS.length]}
                    maxHH={Math.max(...columnasPorEmpresa.map((c) => c.empresa.totalHH), 0.01)}
                    onRemove={() => removerEmpresa(col.empresa.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── VISTA GENERAL ── */}
      {!modoComparacion && (
        <VistaGeneral data={data} empresasDisponibles={empresasDisponibles} onAbrirComparar={() => setModalOpen(true)} />
      )}

      {/* ── MODAL ── */}
      {modalOpen && (
        <EmpresaPickerModal
          empresas={empresasDisponibles}
          selected={empresasSeleccionadas}
          maxSelect={MAX_EMPRESAS}
          onToggle={toggleEmpresa}
          onClose={() => { setModalOpen(false); setModalSearch(""); }}
          search={modalSearch}
          onSearchChange={setModalSearch}
        />
      )}
    </div>
  );
};

export default HorasHombreDashboard;