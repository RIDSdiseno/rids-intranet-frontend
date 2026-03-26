import React from "react";
import { Modal, Select, DatePicker, Alert } from "antd";
import dayjs from "dayjs";
import type { Tecnico, Empresa } from "./tiposAgenda";

export interface CrearVisitaManualProps {
  open: boolean;
  creating: boolean;
  errorText?: string;
  fecha: string;
  empresaId: number | null;
  tecnicoId: number | null;
  horaInicio: string;
  horaFin: string;
  notas: string;
  empresasDisponibles: Empresa[];
  tecnicosDisponibles: Tecnico[];
  onFechaChange: (fecha: string) => void;
  onEmpresaChange: (id: number) => void;
  onTecnicoChange: (id: number) => void;
  onHoraInicioChange: (v: string) => void;
  onHoraFinChange: (v: string) => void;
  onNotasChange: (v: string) => void;
  onOk: () => void;
  onCancel: () => void;
}

export function CrearVisitaManual({
  open,
  creating,
  errorText,
  fecha,
  empresaId,
  tecnicoId,
  horaInicio,
  horaFin,
  notas,
  empresasDisponibles,
  tecnicosDisponibles,
  onFechaChange,
  onEmpresaChange,
  onTecnicoChange,
  onHoraInicioChange,
  onHoraFinChange,
  onNotasChange,
  onOk,
  onCancel,
}: CrearVisitaManualProps) {
  return (
    <Modal
      title="Agregar visita manual"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={creating}
      okText="Crear visita"
      cancelText="Cancelar"
      okButtonProps={{
        disabled: !fecha || empresaId === null || tecnicoId === null,
      }}
      destroyOnHidden
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
        {errorText ? (
          <Alert type="error" showIcon message={errorText} />
        ) : null}

        <div>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>Fecha</p>
          <DatePicker
            style={{ width: "100%" }}
            value={fecha ? dayjs(fecha) : null}
            onChange={(d) => onFechaChange(d ? d.format("YYYY-MM-DD") : "")}
            format="DD/MM/YYYY"
            placeholder="Seleccionar fecha"
          />
        </div>

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
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>Técnico</p>
          <Select
            style={{ width: "100%" }}
            placeholder="Seleccionar técnico"
            value={tecnicoId}
            onChange={onTecnicoChange}
            options={tecnicosDisponibles.map((t) => ({
              label: t.nombre,
              value: t.id_tecnico,
            }))}
            showSearch
            filterOption={(input, option) =>
              (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
            }
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
    </Modal>
  );
}
