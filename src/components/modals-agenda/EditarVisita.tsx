import { Modal, Select, Button, Popconfirm } from "antd";
import dayjs from "dayjs";
import type { AgendaVisita, Tecnico, Empresa } from "./tiposAgenda";

export interface EditarVisitaProps {
  open: boolean;
  visita: AgendaVisita | null;
  empresaId: number | null;
  tecnicoIds: number[];
  horaInicio: string;
  horaFin: string;
  notas: string;
  empresasDisponibles: Empresa[];
  tecnicosDisponibles: Tecnico[];
  saving: boolean;
  sendingNota: boolean;
  deleting: boolean;
  onEmpresaChange: (id: number) => void;
  onTecnicosChange: (ids: number[]) => void;
  onHoraInicioChange: (v: string) => void;
  onHoraFinChange: (v: string) => void;
  onNotasChange: (v: string) => void;
  onSave: () => void;
  onSendNota: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function EditarVisita({
  open,
  visita,
  empresaId,
  tecnicoIds,
  horaInicio,
  horaFin,
  notas,
  empresasDisponibles,
  tecnicosDisponibles,
  saving,
  sendingNota,
  deleting,
  onEmpresaChange,
  onTecnicosChange,
  onHoraInicioChange,
  onHoraFinChange,
  onNotasChange,
  onSave,
  onSendNota,
  onDelete,
  onCancel,
}: EditarVisitaProps) {
  const canSendNota = Boolean(visita && Number.isFinite(visita.id) && visita.id > 0);

  return (
    <Modal
      title={
        visita
          ? `Editar visita — ${dayjs(visita.fecha).format("DD/MM/YYYY")}`
          : "Editar visita"
      }
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancelar
        </Button>,
        <Popconfirm
          key="delete"
          title="¿Eliminar esta visita?"
          onConfirm={onDelete}
          okText="Sí, eliminar"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
        >
          <Button danger loading={deleting} disabled={sendingNota}>
            Eliminar visita
          </Button>
        </Popconfirm>,
        <Button
          key="save"
          type="primary"
          loading={saving}
          disabled={tecnicoIds.length === 0 || sendingNota}
          onClick={onSave}
        >
          Guardar cambios
        </Button>,
        ...(canSendNota
          ? [
            <Button
              key="send-note"
              loading={sendingNota}
              disabled={saving || deleting}
              onClick={onSendNota}
            >
              Enviar nota por correo
            </Button>,
          ]
          : []),
      ]}
    >
      {visita && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 4 }}>
          <div>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>Empresa</p>
            <Select
              style={{ width: "100%" }}
              placeholder="Seleccionar empresa"
              value={empresaId}
              onChange={onEmpresaChange}
              options={[
                { label: "OFICINA", value: -1 },
                ...empresasDisponibles.map((e) => ({
                  label: e.nombre,
                  value: e.id_empresa,
                })),
              ]}
              showSearch
              filterOption={(input, option) =>
                (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>

          <div>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>Técnicos</p>
            <Select
              mode="multiple"
              style={{ width: "100%" }}
              placeholder="Seleccionar técnicos"
              value={tecnicoIds}
              onChange={onTecnicosChange}
              options={tecnicosDisponibles.map((t) => ({
                label: t.nombre,
                value: t.id_tecnico,
              }))}
            />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>Hora inicio</p>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => onHoraInicioChange(e.target.value)}
                style={{ width: "100%", padding: "4px 8px", borderRadius: 6, border: "1px solid #d9d9d9", fontSize: 14 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>Hora fin</p>
              <input
                type="time"
                value={horaFin}
                onChange={(e) => onHoraFinChange(e.target.value)}
                style={{ width: "100%", padding: "4px 8px", borderRadius: 6, border: "1px solid #d9d9d9", fontSize: 14 }}
              />
            </div>
          </div>

          <div>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>Notas</p>
            <textarea
              value={notas}
              onChange={(e) => onNotasChange(e.target.value)}
              rows={2}
              placeholder="Notas internas opcionales"
              style={{ width: "100%", padding: "4px 8px", borderRadius: 6, border: "1px solid #d9d9d9", fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
