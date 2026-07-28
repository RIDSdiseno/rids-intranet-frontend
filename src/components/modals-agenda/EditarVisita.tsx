import { useState } from "react";
import { Modal, Select, Button, Popconfirm, Popover } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { AgendaVisita, Tecnico, Empresa, Sucursal } from "./tiposAgenda";
import { getAgendaEmpresaOptionLabel } from "./agendaEmpresaLabel";
import SeleccionarFechasCalendario from "./SeleccionarFechasCalendario";

export interface EditarVisitaProps {
  open: boolean;
  visita: AgendaVisita | null;
  empresaId: number | null;
  sucursalId: number | null;
  tecnicoIds: number[];
  horaInicio: string;
  horaFin: string;
  notas: string;
  empresasDisponibles: Empresa[];
  sucursalesDisponibles: Sucursal[];
  sucursalesLoading?: boolean;
  tecnicosDisponibles: Tecnico[];
  saving: boolean;
  sendingNota: boolean;
  deleting: boolean;
  // Fechas adicionales para replicar esta misma visita (mismo destino, técnico
  // único y horario) en otros días — para cuando falto agregar un día al crearla.
  fechasAdicionales: string[];
  onFechasAdicionalesChange: (fechas: string[]) => void;
  onEmpresaChange: (id: number) => void;
  onSucursalChange: (id: number | null) => void;
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
  sucursalId,
  tecnicoIds,
  horaInicio,
  horaFin,
  notas,
  empresasDisponibles,
  sucursalesDisponibles,
  sucursalesLoading,
  tecnicosDisponibles,
  saving,
  sendingNota,
  deleting,
  fechasAdicionales,
  onFechasAdicionalesChange,
  onEmpresaChange,
  onSucursalChange,
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
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);
  const puedeRepetirEnOtrosDias = tecnicoIds.length === 1;

  function toggleFechaAdicional(fechaClave: string) {
    if (fechasAdicionales.includes(fechaClave)) {
      onFechasAdicionalesChange(fechasAdicionales.filter((f) => f !== fechaClave));
    } else {
      onFechasAdicionalesChange([...fechasAdicionales, fechaClave].sort());
    }
  }

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
          {fechasAdicionales.length > 0
            ? `Guardar cambios (+${fechasAdicionales.length} día${fechasAdicionales.length === 1 ? "" : "s"})`
            : "Guardar cambios"}
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
              options={empresasDisponibles.map((e) => ({
                label: getAgendaEmpresaOptionLabel(e),
                value: e.id_empresa,
              }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>

          {(visita.destinoNombre || visita.destinoDireccion) && (
            <div>
              <p style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>
                Destino guardado
              </p>
              <p style={{ color: "#334155", fontSize: 13, margin: 0 }}>
                {visita.sucursal?.nombre ?? visita.destinoNombre ?? "Ubicación principal"}
                {visita.destinoDireccion ? ` — ${visita.destinoDireccion}` : ""}
              </p>
            </div>
          )}

          {sucursalesDisponibles.length > 0 && (
            <div>
              <p style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>
                Sucursal de destino
              </p>
              <Select
                style={{ width: "100%" }}
                placeholder="Ubicación principal de la empresa"
                value={sucursalId}
                onChange={(v) => onSucursalChange(v ?? null)}
                loading={sucursalesLoading}
                allowClear
                options={sucursalesDisponibles.map((s) => ({
                  label: s.nombre,
                  value: s.id_sucursal,
                }))}
              />
              {sucursalId != null && !sucursalesDisponibles.some((s) => s.id_sucursal === sucursalId) && (
                <p style={{ color: "#b45309", fontSize: 12, marginTop: 4 }}>
                  La sucursal original ya no está disponible; el destino guardado arriba se conserva
                  igual si no eliges una nueva.
                </p>
              )}
            </div>
          )}

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

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>
                Repetir esta visita en otros días
              </span>
              <Popover
                trigger="click"
                open={calendarioAbierto}
                onOpenChange={(next) => puedeRepetirEnOtrosDias && setCalendarioAbierto(next)}
                placement="bottomLeft"
                getPopupContainer={() => document.body}
                content={
                  <div style={{ width: 260 }}>
                    <SeleccionarFechasCalendario
                      fechasSeleccionadas={fechasAdicionales}
                      onToggleFecha={toggleFechaAdicional}
                    />
                  </div>
                }
              >
                <button
                  type="button"
                  aria-label="Abrir calendario"
                  disabled={!puedeRepetirEnOtrosDias}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    color: puedeRepetirEnOtrosDias ? "#0891b2" : "#94a3b8",
                    background: calendarioAbierto ? "#e0f2fe" : "none",
                    border: `1px solid ${puedeRepetirEnOtrosDias ? "#0891b2" : "#cbd5e1"}`,
                    borderRadius: 6,
                    cursor: puedeRepetirEnOtrosDias ? "pointer" : "not-allowed",
                  }}
                >
                  <CalendarOutlined />
                </button>
              </Popover>
            </div>
            {!puedeRepetirEnOtrosDias && (
              <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                Selecciona un solo técnico para poder repetir la visita en otros días.
              </p>
            )}
            {fechasAdicionales.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {fechasAdicionales.map((f) => (
                  <span
                    key={f}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#e0f2fe",
                      color: "#0369a1",
                      borderRadius: 999,
                      padding: "2px 8px",
                      fontSize: 12,
                    }}
                  >
                    {dayjs(f).format("DD/MM/YYYY")}
                    <button
                      type="button"
                      onClick={() => toggleFechaAdicional(f)}
                      aria-label="Quitar fecha"
                      style={{ background: "none", border: "none", color: "#0369a1", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0 }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
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
