import React from "react";
import { Modal, Select, Checkbox } from "antd";
import type { Dayjs } from "dayjs";
import type { Empresa } from "./tiposAgenda";

export interface CrearVisitaAutomaticaProps {
  open: boolean;
  generando: boolean;
  currentDate: Dayjs;
  selectedEmpresaIds: number[];
  includeOficina: boolean;
  empresasDisponibles: Empresa[];
  onEmpresaIdsChange: (ids: number[]) => void;
  onIncludeOficinaChange: (v: boolean) => void;
  onOk: () => void;
  onCancel: () => void;
}

export function CrearVisitaAutomatica({
  open,
  generando,
  currentDate,
  selectedEmpresaIds,
  includeOficina,
  empresasDisponibles,
  onEmpresaIdsChange,
  onIncludeOficinaChange,
  onOk,
  onCancel,
}: CrearVisitaAutomaticaProps) {
  return (
    <Modal
      title="Generar malla mensual"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={generando}
      okText="Generar"
      cancelText="Cancelar"
      destroyOnHidden
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
          Se generará la malla para{" "}
          <strong style={{ textTransform: "capitalize" }}>
            {currentDate.format("MMMM YYYY")}
          </strong>
          . Selecciona las empresas a incluir (opcional):
        </p>

        <div>
          <p style={{ margin: "0 0 4px", fontSize: 12, color: "#94a3b8" }}>Empresas</p>
          <Select
            mode="multiple"
            style={{ width: "100%" }}
            placeholder="Sin filtro — todas las empresas"
            value={selectedEmpresaIds}
            onChange={onEmpresaIdsChange}
            options={empresasDisponibles.map((e) => ({
              label: e.nombre,
              value: e.id_empresa,
            }))}
            showSearch
            filterOption={(input, option) =>
              (option?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
            }
            allowClear
          />
        </div>

        <div>
          <p style={{ margin: "0 0 6px", fontSize: 12, color: "#94a3b8" }}>
            OFICINA (se maneja por separado)
          </p>
          <Checkbox
            checked={includeOficina}
            onChange={(e) => onIncludeOficinaChange(e.target.checked)}
          >
            Incluir OFICINA
          </Checkbox>
        </div>

        {selectedEmpresaIds.length === 0 && !includeOficina && (
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
            Sin selección → se generará la malla con la lógica automática del backend.
          </p>
        )}
      </div>
    </Modal>
  );
}
