// src/host/components/HorasHombreDashboard.tsx
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

/* ====================== Helpers ====================== */
function fmtH(v?: number | null) {
  return Number(v ?? 0).toLocaleString("es-CL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
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
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_PALETTE: [string, string][] = [
  ["#E6F1FB", "#185FA5"],
  ["#E1F5EE", "#0F6E56"],
  ["#EEEDFE", "#534AB7"],
  ["#FAECE7", "#993C1D"],
  ["#FAEEDA", "#854F0B"],
  ["#FBEAF0", "#993556"],
  ["#EAF3DE", "#3B6D11"],
  ["#F1EFE8", "#444441"],
];
function avatarColor(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

// Colores para columnas de empresa en la comparativa
const EMPRESA_COLORS = [
  { bg: "#E6F1FB", text: "#0C447C", bar: "#185FA5", badge: "#185FA5" },
  { bg: "#E1F5EE", text: "#085041", bar: "#0F6E56", badge: "#0F6E56" },
  { bg: "#EEEDFE", text: "#3C3489", bar: "#534AB7", badge: "#534AB7" },
  { bg: "#FAEEDA", text: "#633806", bar: "#854F0B", badge: "#854F0B" },
];

/* ====================== Barra horizontal ====================== */
const HBar: React.FC<{ pct: number; color: string; h?: number }> = ({ pct, color, h = 5 }) => (
  <div
    style={{
      background: "#f1f5f9",
      borderRadius: 99,
      overflow: "hidden",
      height: h,
      width: "100%",
    }}
  >
    <div
      style={{
        height: "100%",
        width: `${Math.min(100, Math.max(0, Math.round(pct)))}%`,
        background: color,
        borderRadius: 99,
        transition: "width 0.4s ease",
      }}
    />
  </div>
);

/* ====================== KPI mini card ====================== */
const KpiCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, sub, icon, color }) => (
  <div
    style={{
      background: "var(--color-background-secondary)",
      borderRadius: "var(--border-radius-md)",
      padding: "10px 14px",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: "var(--color-text-secondary)",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <span style={{ color, fontSize: 14 }}>{icon}</span>
    </div>
    <div
      style={{
        fontSize: 22,
        fontWeight: 500,
        color: "var(--color-text-primary)",
        lineHeight: 1.1,
      }}
    >
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
        {sub}
      </div>
    )}
  </div>
);

/* ====================== Sparkline SVG ====================== */
const Sparkline: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  if (values.length < 2) return null;
  const w = 80;
  const h = 24;
  const max = Math.max(...values, 0.01);
  const step = w / (values.length - 1);
  const pts = values
    .map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 4) - 2).toFixed(1)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      style={{ display: "block" }}
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
};

/* ====================== Modal: selector de empresas ====================== */
const EmpresaPickerModal: React.FC<{
  empresas: Array<{ id: number; nombre: string; totalHH: number }>;
  selected: number[];
  maxSelect: number;
  onToggle: (id: number) => void;
  onClose: () => void;
  search: string;
  onSearchChange: (v: string) => void;
}> = ({
  empresas,
  selected,
  maxSelect,
  onToggle,
  onClose,
  search,
  onSearchChange,
}) => {
    const filtered = empresas.filter(
      (e) =>
        !search.trim() ||
        e.nombre.toLowerCase().includes(search.toLowerCase())
    );

    const maxHH = Math.max(...empresas.map((e) => e.totalHH), 0.01);

    return (
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(15, 23, 42, 0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            width: "min(760px, 100%)",
            maxHeight: "82vh",
            background: "var(--color-background-primary, #fff)",
            borderRadius: 18,
            boxShadow: "0 24px 80px rgba(15, 23, 42, 0.28)",
            border: "1px solid rgba(148, 163, 184, 0.35)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "18px 20px",
              borderBottom: "1px solid rgba(226, 232, 240, 0.9)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--color-text-primary, #0f172a)",
                }}
              >
                Seleccionar empresas a comparar
              </h3>

              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 13,
                  color: "var(--color-text-secondary, #64748b)",
                }}
              >
                Elige hasta {maxSelect} empresas para comparar sus horas hombre.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 18,
                color: "var(--color-text-secondary, #64748b)",
                padding: 4,
                lineHeight: 1,
              }}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {/* Search */}
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid rgba(226, 232, 240, 0.9)",
            }}
          >
            <div style={{ position: "relative" }}>
              <SearchOutlined
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                  fontSize: 14,
                }}
              />

              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar empresa..."
                autoFocus
                style={{
                  width: "100%",
                  border: "1px solid #cbd5e1",
                  borderRadius: 12,
                  padding: "10px 12px 10px 36px",
                  outline: "none",
                  fontSize: 14,
                  color: "#0f172a",
                  background: "#fff",
                }}
              />
            </div>
          </div>

          {/* Body */}
          <div
            style={{
              padding: 16,
              overflowY: "auto",
              flex: 1,
            }}
          >
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: 32,
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: 14,
                }}
              >
                No se encontraron empresas.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: 10,
                }}
              >
                {filtered.map((empresa) => {
                  const checked = selected.includes(empresa.id);
                  const disabled = !checked && selected.length >= maxSelect;
                  const pct = (empresa.totalHH / maxHH) * 100;

                  return (
                    <button
                      key={empresa.id}
                      type="button"
                      onClick={() => {
                        if (disabled) return;
                        onToggle(empresa.id);
                      }}
                      disabled={disabled}
                      style={{
                        textAlign: "left",
                        border: checked
                          ? "1.5px solid #0891b2"
                          : "1px solid #e2e8f0",
                        background: checked ? "#ecfeff" : "#fff",
                        borderRadius: 14,
                        padding: 12,
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.45 : 1,
                        transition: "all .15s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            color: "#0f172a",
                            fontSize: 14,
                            lineHeight: 1.25,
                          }}
                        >
                          {empresa.nombre}
                        </div>

                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 999,
                            border: checked
                              ? "5px solid #0891b2"
                              : "1px solid #cbd5e1",
                            background: "#fff",
                            flexShrink: 0,
                          }}
                        />
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      >
                        {fmtH(empresa.totalHH)} h
                      </div>

                      <div style={{ marginTop: 8 }}>
                        <HBar pct={pct} color="#0891b2" h={5} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "14px 20px",
              borderTop: "1px solid rgba(226, 232, 240, 0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              background: "#f8fafc",
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: "#475569",
              }}
            >
              {selected.length} de {maxSelect} seleccionadas
            </span>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#334155",
                  borderRadius: 12,
                  padding: "9px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={selected.length === 0}
                style={{
                  border: "none",
                  background: selected.length === 0 ? "#94a3b8" : "#0891b2",
                  color: "#fff",
                  borderRadius: 12,
                  padding: "9px 16px",
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

/* ====================== Columna de empresa en comparativa ====================== */
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
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "var(--color-background-primary)",
        border: `1px solid ${colorScheme.badge}33`,
        borderRadius: "var(--border-radius-lg)",
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
      }}
    >
      {/* Header columna */}
      <div
        style={{
          background: colorScheme.bg,
          padding: "12px 14px",
          borderBottom: `0.5px solid ${colorScheme.badge}22`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: colorScheme.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={empresa.nombre}
            >
              {empresa.nombre}
            </div>
            <div style={{ fontSize: 11, color: colorScheme.text, opacity: 0.7, marginTop: 1 }}>
              {tecnicoRows.length} técnico{tecnicoRows.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            title="Quitar empresa"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: colorScheme.text,
              opacity: 0.5,
              fontSize: 13,
              padding: 2,
              flexShrink: 0,
            }}
          >
            <CloseOutlined />
          </button>
        </div>
        {/* Total H.H. grande */}
        <div
          style={{
            fontSize: 26,
            fontWeight: 500,
            color: colorScheme.text,
            lineHeight: 1,
            marginBottom: 6,
          }}
        >
          {fmtH(empresa.totalHH)} h
        </div>
        {/* Desglose visitas / remotas */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: colorScheme.text, opacity: 0.8, width: 52 }}>
              Visitas
            </span>
            <HBar
              pct={empresa.totalHH > 0 ? (totalV / empresa.totalHH) * 100 : 0}
              color={colorScheme.bar}
              h={4}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: colorScheme.text,
                width: 46,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {fmtH(totalV)} h
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: colorScheme.text, opacity: 0.8, width: 52 }}>
              Remotas
            </span>
            <HBar
              pct={empresa.totalHH > 0 ? (totalR / empresa.totalHH) * 100 : 0}
              color={colorScheme.bar}
              h={4}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: colorScheme.text,
                width: 46,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {fmtH(totalR)} h
            </span>
          </div>
        </div>
      </div>

      {/* Ranking de técnicos */}
      <div>
        {tecnicoRows.length === 0 && (
          <div
            style={{
              padding: "20px 14px",
              textAlign: "center",
              fontSize: 12,
              color: "var(--color-text-secondary)",
            }}
          >
            Sin actividad en este período.
          </div>
        )}
        {tecnicoRows.map((row, idx) => {
          const [avBg, avFg] = avatarColor(row.tecnico);
          const pct = empresa.totalHH > 0 ? (row.totalHorasHombre / empresa.totalHH) * 100 : 0;
          const mesSparkVals = row.meses
            .sort((a, b) => a.mes.localeCompare(b.mes))
            .map((m) => m.horasTotal);
          const isOpen = expanded === row.tecnicoId;

          return (
            <div
              key={row.tecnicoId}
              style={{
                borderBottom: "0.5px solid var(--color-border-tertiary)",
                background:
                  idx % 2 === 0
                    ? "var(--color-background-primary)"
                    : "var(--color-background-secondary)",
              }}
            >
              {/* Fila principal */}
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : row.tecnicoId)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  {/* Rank badge */}
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background:
                        idx === 0
                          ? colorScheme.badge
                          : "var(--color-background-secondary)",
                      color: idx === 0 ? "#fff" : "var(--color-text-secondary)",
                      fontSize: 10,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      border: `1px solid ${idx === 0 ? colorScheme.badge : "var(--color-border-secondary)"}`,
                    }}
                  >
                    {idx + 1}
                  </div>
                  {/* Avatar */}
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: avBg,
                      color: avFg,
                      fontSize: 10,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {initials(row.tecnico)}
                  </div>
                  {/* Nombre */}
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12,
                      fontWeight: idx === 0 ? 500 : 400,
                      color: "var(--color-text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.tecnico}
                  </span>
                  {/* Total + chevron */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: colorScheme.badge,
                        flexShrink: 0,
                      }}
                    >
                      {fmtH(row.totalHorasHombre)} h
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--color-text-secondary)",
                        transition: "transform 0.2s",
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        display: "inline-block",
                      }}
                    >
                      ▾
                    </span>
                  </div>
                </div>
                {/* Barra proporcional */}
                <div style={{ paddingLeft: 52 }}>
                  <HBar pct={pct} color={colorScheme.bar} h={4} />
                </div>
              </button>

              {/* Detalle expandible */}
              {isOpen && (
                <div
                  style={{
                    padding: "0 14px 12px",
                    background: `${colorScheme.bg}66`,
                    borderTop: `0.5px solid ${colorScheme.badge}22`,
                  }}
                >
                  {/* Mini KPIs */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 6,
                      paddingTop: 10,
                      marginBottom: 10,
                    }}
                  >
                    {[
                      { label: "H. visitas", val: `${fmtH(row.totalHorasVisitas)} h`, color: colorScheme.badge },
                      { label: "H. remotas", val: `${fmtH(row.totalHorasRemotas)} h`, color: colorScheme.badge },
                      { label: "Tickets", val: fmtInt(row.tickets), color: colorScheme.badge },
                    ].map((k) => (
                      <div
                        key={k.label}
                        style={{
                          background: colorScheme.bg,
                          borderRadius: 6,
                          padding: "6px 8px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: colorScheme.text,
                            opacity: 0.7,
                            marginBottom: 2,
                          }}
                        >
                          {k.label}
                        </div>
                        <div
                          style={{ fontSize: 13, fontWeight: 500, color: colorScheme.text }}
                        >
                          {k.val}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Sparkline + meses */}
                  {mesSparkVals.filter((v) => v > 0).length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          color: colorScheme.text,
                          opacity: 0.7,
                          marginBottom: 4,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Tendencia mensual
                      </div>
                      <Sparkline values={mesSparkVals} color={colorScheme.bar} />
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "2px 8px",
                          marginTop: 4,
                        }}
                      >
                        {row.meses
                          .filter((m) => m.horasTotal > 0)
                          .sort((a, b) => a.mes.localeCompare(b.mes))
                          .map((m) => (
                            <span
                              key={m.mes}
                              style={{ fontSize: 11, color: colorScheme.text, opacity: 0.8 }}
                            >
                              {formatMesLabel(m.mes)}:{" "}
                              <strong style={{ opacity: 1 }}>{fmtH(m.horasTotal)} h</strong>
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

/* ====================== Vista general (sin comparativa activa) ====================== */
const VistaGeneral: React.FC<{
  data: HorasTecnicosDashboardData;
  empresasDisponibles: Array<{ id: number; nombre: string; totalHH: number }>;
  onAbrirComparar: () => void;
}> = ({ data, empresasDisponibles, onAbrirComparar }) => {
  const resumen = useMemo(
    () =>
      [...data.resumenPorTecnico].sort((a, b) => b.totalHorasHombre - a.totalHorasHombre),
    [data]
  );
  const maxHH = Math.max(...resumen.map((r) => r.totalHorasHombre), 0.01);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Banner de acción */}
      <div
        style={{
          background: "var(--color-background-secondary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-primary)",
              marginBottom: 2,
            }}
          >
            Vista general del período
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            {empresasDisponibles.length} empresa{empresasDisponibles.length !== 1 ? "s" : ""} con actividad ·{" "}
            {data.kpis.tecnicosConActividad} técnico{data.kpis.tecnicosConActividad !== 1 ? "s" : ""} activos
          </div>
        </div>
        <button
          type="button"
          onClick={onAbrirComparar}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 10,
            background: "#185FA5",
            color: "#fff",
            border: "none",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <SwapOutlined style={{ fontSize: 13 }} />
          Comparar empresas
        </button>
      </div>

      {/* Ranking general de técnicos */}
      <div
        style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
            background: "var(--color-background-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
              Ranking general de técnicos
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--color-text-secondary)",
                display: "block",
                marginTop: 1,
              }}
            >
              Acumulado de todas las empresas
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              background: "#E6F1FB",
              color: "#0C447C",
              padding: "3px 8px",
              borderRadius: 99,
              fontWeight: 500,
            }}
          >
            {fmtInt(data.kpis.tecnicosConActividad)} técnicos
          </span>
        </div>

        {/* Mobile: cards */}
        <div className="block lg:hidden">
          {resumen.map((row, i) => {
            const [avBg, avFg] = avatarColor(row.tecnico);
            const pct = (row.totalHorasHombre / maxHH) * 100;
            return (
              <div
                key={row.tecnicoId}
                style={{
                  padding: "12px 16px",
                  borderBottom: "0.5px solid var(--color-border-tertiary)",
                  background:
                    i % 2 === 0
                      ? "var(--color-background-primary)"
                      : "var(--color-background-secondary)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: i < 3 ? "#185FA5" : "var(--color-background-secondary)",
                      color: i < 3 ? "#fff" : "var(--color-text-secondary)",
                      fontSize: 10,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: avBg,
                      color: avFg,
                      fontSize: 11,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {initials(row.tecnico)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {row.tecnico}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                      {fmtInt(row.visitas ?? row.jornadas ?? 0)} vis · {fmtInt(row.remotas)} rem · {fmtInt(row.tickets)} tickets
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 500,
                        color: "#185FA5",
                      }}
                    >
                      {fmtH(row.totalHorasHombre)} h
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                      total
                    </div>
                  </div>
                </div>
                <HBar pct={pct} color="#185FA5" h={4} />
              </div>
            );
          })}
        </div>

        {/* Desktop: tabla */}
        <div className="hidden lg:block overflow-x-auto">
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  borderBottom: "0.5px solid var(--color-border-tertiary)",
                  background: "var(--color-background-secondary)",
                }}
              >
                <th
                  style={{
                    padding: "8px 16px",
                    textAlign: "left",
                    fontSize: 11,
                    color: "var(--color-text-secondary)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    width: 32,
                  }}
                >
                  #
                </th>
                <th
                  style={{
                    padding: "8px 16px",
                    textAlign: "left",
                    fontSize: 11,
                    color: "var(--color-text-secondary)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Técnico
                </th>
                <th
                  style={{
                    padding: "8px 16px",
                    textAlign: "right",
                    fontSize: 11,
                    color: "var(--color-text-secondary)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  H. visitas
                </th>
                <th
                  style={{
                    padding: "8px 16px",
                    textAlign: "right",
                    fontSize: 11,
                    color: "var(--color-text-secondary)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  H. remotas
                </th>
                <th
                  style={{
                    padding: "8px 16px",
                    textAlign: "right",
                    fontSize: 11,
                    color: "var(--color-text-secondary)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Total H.H.
                </th>
                <th
                  style={{
                    padding: "8px 16px",
                    textAlign: "left",
                    fontSize: 11,
                    color: "var(--color-text-secondary)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    width: 160,
                  }}
                >
                  Distribución
                </th>
                <th
                  style={{
                    padding: "8px 16px",
                    textAlign: "right",
                    fontSize: 11,
                    color: "var(--color-text-secondary)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Visitas
                </th>
                <th
                  style={{
                    padding: "8px 16px",
                    textAlign: "right",
                    fontSize: 11,
                    color: "var(--color-text-secondary)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Tickets
                </th>
              </tr>
            </thead>
            <tbody>
              {resumen.map((row, i) => {
                const [avBg, avFg] = avatarColor(row.tecnico);
                const pct = (row.totalHorasHombre / maxHH) * 100;
                return (
                  <tr
                    key={row.tecnicoId}
                    style={{
                      borderBottom: "0.5px solid var(--color-border-tertiary)",
                      background:
                        i % 2 === 0
                          ? "var(--color-background-primary)"
                          : "var(--color-background-secondary)",
                    }}
                  >
                    <td style={{ padding: "10px 16px" }}>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: i < 3 ? "#185FA5" : "var(--color-background-secondary)",
                          color: i < 3 ? "#fff" : "var(--color-text-secondary)",
                          fontSize: 10,
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {i + 1}
                      </div>
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: avBg,
                            color: avFg,
                            fontSize: 11,
                            fontWeight: 500,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {initials(row.tecnico)}
                        </div>
                        <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>
                          {row.tecnico}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "10px 16px",
                        textAlign: "right",
                        color: "#185FA5",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtH(row.totalHorasVisitas)} h
                    </td>
                    <td
                      style={{
                        padding: "10px 16px",
                        textAlign: "right",
                        color: "#534AB7",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtH(row.totalHorasRemotas)} h
                    </td>
                    <td
                      style={{
                        padding: "10px 16px",
                        textAlign: "right",
                        fontWeight: 500,
                        color: "var(--color-text-primary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtH(row.totalHorasHombre)} h
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <HBar pct={pct} color="#185FA5" h={5} />
                    </td>
                    <td
                      style={{
                        padding: "10px 16px",
                        textAlign: "right",
                        color: "var(--color-text-secondary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtInt(row.visitas ?? row.jornadas ?? 0)}
                    </td>
                    <td
                      style={{
                        padding: "10px 16px",
                        textAlign: "right",
                        color: "var(--color-text-secondary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtInt(row.tickets)}
                    </td>
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

  // Empresas disponibles con su total
  const empresasDisponibles = useMemo(() => {
    if (!data) return [];
    const map = new Map<number, { id: number; nombre: string; totalHH: number }>();
    data.porTecnicoEmpresa.forEach((row) => {
      if (!map.has(row.empresaId)) {
        map.set(row.empresaId, { id: row.empresaId, nombre: row.empresa, totalHH: 0 });
      }
      map.get(row.empresaId)!.totalHH += row.totalHorasHombre;
    });
    return [...map.values()].sort((a, b) => b.totalHH - a.totalHH);
  }, [data]);

  // Para cada empresa seleccionada, armar ranking de técnicos
  const columnasPorEmpresa = useMemo(() => {
    if (!data) return [];
    return empresasSeleccionadas.map((empId) => {
      const empresa = empresasDisponibles.find((e) => e.id === empId);
      if (!empresa) return null;
      const rows = data.porTecnicoEmpresa
        .filter((r) => r.empresaId === empId)
        .sort((a, b) => b.totalHorasHombre - a.totalHorasHombre)
        .map((r, i) => ({ ...r, rank: i + 1 }));
      return { empresa, rows };
    }).filter(Boolean) as Array<{
      empresa: { id: number; nombre: string; totalHH: number };
      rows: Array<HorasTecnicoEmpresaRow & { rank: number }>;
    }>;
  }, [data, empresasSeleccionadas, empresasDisponibles]);

  const toggleEmpresa = (id: number) => {
    setEmpresasSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, MAX_EMPRESAS)
    );
  };
  const removerEmpresa = (id: number) => {
    setEmpresasSeleccionadas((prev) => prev.filter((x) => x !== id));
  };

  /* ---- Estados ---- */
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            style={{
              height: i === 0 ? 80 : 120,
              borderRadius: "var(--border-radius-lg)",
              background: "var(--color-background-secondary)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div
        style={{
          border: "0.5px solid var(--color-border-danger)",
          background: "var(--color-background-danger)",
          borderRadius: "var(--border-radius-lg)",
          padding: 24,
          textAlign: "center",
          color: "var(--color-text-danger)",
          fontSize: 14,
        }}
      >
        {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div
        style={{
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "var(--border-radius-lg)",
          padding: "48px 24px",
          textAlign: "center",
          color: "var(--color-text-secondary)",
          fontSize: 14,
        }}
      >
        <ClockCircleOutlined style={{ fontSize: 32, display: "block", margin: "0 auto 12px" }} />
        Sin datos para el período seleccionado.
      </div>
    );
  }

  const modoComparacion = empresasSeleccionadas.length > 0;

  return (
    // Wrapper relativo para que el modal absoluto quede contenido
    <div style={{ position: "relative" }}>

      {/* KPIs globales */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <KpiCard
          label="Total H.H."
          value={`${fmtH(data.kpis.totalHorasHombre)} h`}
          sub="Visitas + remotas"
          icon={<ClockCircleOutlined />}
          color="#0891b2"
        />
        <KpiCard
          label="H. visitas"
          value={`${fmtH(data.kpis.totalHorasVisitas)} h`}
          sub="Registros completados"
          icon={<TeamOutlined />}
          color="#185FA5"
        />
        <KpiCard
          label="H. remotas"
          value={`${fmtH(data.kpis.totalHorasRemotas)} h`}
          sub="Mantenciones remotas"
          icon={<BuildOutlined />}
          color="#534AB7"
        />
        <KpiCard
          label="Tickets"
          value={fmtInt(data.kpis.totalTickets)}
          sub="No suman horas"
          icon={<FileDoneOutlined />}
          color="#5F5E5A"
        />
        <KpiCard
          label="Técnicos"
          value={String(data.kpis.tecnicosConActividad)}
          sub="Con actividad"
          icon={<TeamOutlined />}
          color="#0F6E56"
        />
      </div>

      {/* ---- MODO COMPARACIÓN ---- */}
      {modoComparacion && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Toolbar comparación */}
          <div
            style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-lg)",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              position: "sticky",
              top: 0,
              zIndex: 10,
            }}
          >
            <span
              style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}
            >
              Comparando:
            </span>
            {/* Chips de empresas activas */}
            {columnasPorEmpresa.map((col, i) => {
              const ec = EMPRESA_COLORS[i % EMPRESA_COLORS.length];
              return (
                <span
                  key={col.empresa.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 10px",
                    borderRadius: 99,
                    background: ec.bg,
                    color: ec.text,
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {col.empresa.nombre}
                  <button
                    type="button"
                    onClick={() => removerEmpresa(col.empresa.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: ec.text,
                      fontSize: 11,
                      padding: 0,
                      lineHeight: 1,
                      opacity: 0.6,
                    }}
                  >
                    ✕
                  </button>
                </span>
              );
            })}
            {/* Agregar empresa */}
            {empresasSeleccionadas.length < MAX_EMPRESAS && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 10px",
                  borderRadius: 99,
                  background: "var(--color-background-secondary)",
                  color: "var(--color-text-secondary)",
                  border: "0.5px dashed var(--color-border-secondary)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                <PlusOutlined style={{ fontSize: 11 }} /> Agregar
              </button>
            )}
            {/* Volver a vista general */}
            <button
              type="button"
              onClick={() => setEmpresasSeleccionadas([])}
              style={{
                marginLeft: "auto",
                fontSize: 12,
                color: "var(--color-text-secondary)",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <BarsOutlined style={{ fontSize: 12 }} /> Vista general
            </button>
          </div>

          {/* Columnas comparativas */}
          <div
            style={{
              width: "100%",
              overflowX: "auto",
              paddingBottom: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 14,
                alignItems: "stretch",
                minWidth: "max-content",
              }}
            >
              {columnasPorEmpresa.map((col, i) => (
                <div
                  key={col.empresa.id}
                  style={{
                    flex: "0 0 360px",
                    width: 360,
                    maxWidth: 360,
                  }}
                >
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

      {/* ---- VISTA GENERAL ---- */}
      {!modoComparacion && (
        <VistaGeneral
          data={data}
          empresasDisponibles={empresasDisponibles}
          onAbrirComparar={() => setModalOpen(true)}
        />
      )}

      {/* ---- MODAL SELECTOR ---- */}
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