import React from "react";
import { Modal, Button } from "antd";
import type { AgendaVisita } from "./tiposAgenda";

export interface DiaAgendaProps {
  open: boolean;
  fecha: string;
  visitas: AgendaVisita[];
  onAgregarVisita: () => void;
  onVisitaClick: (visita: AgendaVisita) => void;
  onCancel: () => void;
}

export function DiaAgenda({
  open,
  fecha,
  visitas,
  onAgregarVisita,
  onVisitaClick,
  onCancel,
}: DiaAgendaProps) {
  type Grupo = { nombre: string; visitas: AgendaVisita[] };

  const grupos = new Map<string, Grupo>();
  for (const v of visitas) {
    if (v.tecnicos.length === 0) {
      const k = "__sin_tecnico__";
      if (!grupos.has(k)) grupos.set(k, { nombre: "Sin técnico", visitas: [] });
      grupos.get(k)!.visitas.push(v);
    } else {
      for (const tr of v.tecnicos) {
        const k = String(tr.tecnico.id_tecnico);
        if (!grupos.has(k)) grupos.set(k, { nombre: tr.tecnico.nombre, visitas: [] });
        grupos.get(k)!.visitas.push(v);
      }
    }
  }

  return (
    <Modal
      title={<span style={{ textTransform: "capitalize" }}>{fecha}</span>}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <div style={{ marginBottom: 12 }}>
        <Button type="dashed" size="small" onClick={onAgregarVisita}>
          + Agregar visita
        </Button>
      </div>

      {visitas.length === 0 ? (
        <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", margin: "16px 0" }}>
          Sin visitas este día
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from(grupos.values())
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .map((grupo) => (
              <div
                key={grupo.nombre}
                style={{ borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}
              >
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "6px 12px",
                    borderBottom: "1px solid #e2e8f0",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  {grupo.nombre}
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {grupo.visitas
                    .sort((a, b) => {
                      const nombreA = a.empresa?.nombre?.trim() || a.empresaExternaNombre?.trim() || "OFICINA";
                      const nombreB = b.empresa?.nombre?.trim() || b.empresaExternaNombre?.trim() || "OFICINA";
                      return nombreA.localeCompare(nombreB);
                    })
                    .map((v) => (
                      <div
                        key={v.id}
                        onClick={() => onVisitaClick(v)}
                        style={{
                          cursor: "pointer",
                          padding: "7px 12px",
                          borderLeft: "3px solid #0ea5e9",
                          background: "#fff",
                          transition: "background 0.15s",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f9ff")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>
                          {v.empresa?.nombre?.trim()?.toUpperCase() || v.empresaExternaNombre?.trim()?.toUpperCase() || "OFICINA"}
                        </span>
                        {(v.horaInicio || v.horaFin) && (
                          <span style={{ fontSize: 12, color: "#475569" }}>
                            {v.horaInicio ?? "--:--"} - {v.horaFin ?? "--:--"}
                          </span>
                        )}
                        {v.tipo && (
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>{v.tipo}</span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </Modal>
  );
}
