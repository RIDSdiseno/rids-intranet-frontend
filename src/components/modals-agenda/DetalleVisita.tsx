import React from "react";
import { Modal, Button, Popconfirm } from "antd";
import type { AgendaVisita } from "./tiposAgenda";

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

  return (
    <Modal
      title={visita.empresa?.nombre?.trim()?.toUpperCase() || visita.empresaExternaNombre?.trim()?.toUpperCase() || "OFICINA"}
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
          <span style={{ color: "#94a3b8" }}>Empresa: </span>
          <strong style={{ color: "#dc2626" }}>
            {visita.empresa?.nombre?.trim()?.toUpperCase() || visita.empresaExternaNombre?.trim()?.toUpperCase() || "OFICINA"}
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
