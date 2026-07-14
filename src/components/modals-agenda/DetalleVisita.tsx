import React from "react";
import { Modal, Button, Popconfirm } from "antd";
import type { AgendaVisita } from "./tiposAgenda";
import { getAgendaEstadoBadgeStyle, getAgendaEstadoLabel } from "./tiposAgenda";
import { getAgendaEmpresaNombreFromVisita } from "./agendaEmpresaLabel";

export interface DetalleVisitaProps {
  open: boolean;
  visita: AgendaVisita | null;
  deleting: boolean;
  onEditar: (visita: AgendaVisita) => void;
  onEliminar: () => void;
  onCancel: () => void;
}

export function DetalleVisita({
  open,
  visita,
  deleting,
  onEditar,
  onEliminar,
  onCancel,
}: DetalleVisitaProps) {
  if (!visita) return null;
  const nombreEmpresa = getAgendaEmpresaNombreFromVisita(visita).toUpperCase();

  return (
    <Modal
      title={nombreEmpresa}
      open={open}
      onCancel={onCancel}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Popconfirm
            title="¿Eliminar esta visita?"
            onConfirm={onEliminar}
            okText="Sí, eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button danger loading={deleting}>
              Eliminar
            </Button>
          </Popconfirm>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={onCancel}>Cerrar</Button>
            <Button type="primary" onClick={() => onEditar(visita)}>
              Editar
            </Button>
          </div>
        </div>
      }
      destroyOnHidden
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, marginTop: 4 }}>
        <div>
          <span style={{ color: "#94a3b8" }}>Estado: </span>
          <span
            style={{
              ...getAgendaEstadoBadgeStyle(visita.estado),
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              padding: "2px 8px",
            }}
          >
            {getAgendaEstadoLabel(visita.estado)}
          </span>
        </div>

        <div>
          <span style={{ color: "#94a3b8" }}>Empresa: </span>
          <strong style={{ color: "#dc2626" }}>
            {nombreEmpresa}
          </strong>
        </div>

        {(visita.horaInicio || visita.horaFin) && (
          <div>
            <span style={{ color: "#94a3b8" }}>Horario: </span>
            <span style={{ color: "#475569" }}>
              {visita.horaInicio ?? "--:--"} - {visita.horaFin ?? "--:--"}
            </span>
          </div>
        )}

        {visita.tecnicos.length > 0 && (
          <div>
            <span style={{ color: "#94a3b8" }}>Técnicos: </span>
            <span style={{ color: "#334155" }}>
              {visita.tecnicos.map((tr) => tr.tecnico.nombre).join(", ")}
            </span>
          </div>
        )}

        {visita.tipo && (
          <div>
            <span style={{ color: "#94a3b8" }}>Tipo: </span>
            <span style={{ color: "#334155" }}>{visita.tipo}</span>
          </div>
        )}

        {visita.fechaInicioRuta && (
          <div>
            <span style={{ color: "#94a3b8" }}>Inicio ruta: </span>
            <span style={{ color: "#334155" }}>{new Date(visita.fechaInicioRuta).toLocaleString("es-CL")}</span>
          </div>
        )}

        {visita.fechaInicioVisita && (
          <div>
            <span style={{ color: "#94a3b8" }}>Inicio visita: </span>
            <span style={{ color: "#334155" }}>{new Date(visita.fechaInicioVisita).toLocaleString("es-CL")}</span>
          </div>
        )}

        <div
          style={{
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: visita.visita ? "#f8fafc" : "#fff7ed",
            padding: "8px 10px",
            marginTop: 4,
          }}
        >
          <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>
            Formulario asociado
          </div>
          {visita.visita ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
              <span style={{ color: "#0f172a", fontWeight: 700 }}>
                Visita #{visita.visita.id_visita}
              </span>
              <span style={{ color: "#475569", fontSize: 12 }}>
                Estado: {visita.visita.status ?? "Sin estado"} · Origen: {visita.visita.origen ?? "AGENDA"}
              </span>
              {(visita.visita.inicio || visita.visita.fin) && (
                <span style={{ color: "#475569", fontSize: 12 }}>
                  {visita.visita.inicio ? new Date(visita.visita.inicio).toLocaleString("es-CL") : "--"}{" "}
                  - {visita.visita.fin ? new Date(visita.visita.fin).toLocaleString("es-CL") : "En curso"}
                </span>
              )}
            </div>
          ) : (
            <span style={{ color: "#9a3412", fontSize: 13 }}>
              Sin formulario de visita asociado.
            </span>
          )}
        </div>

        {visita.notas && (
          <div>
            <span style={{ color: "#94a3b8" }}>Notas: </span>
            <span style={{ color: "#334155" }}>{visita.notas}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
