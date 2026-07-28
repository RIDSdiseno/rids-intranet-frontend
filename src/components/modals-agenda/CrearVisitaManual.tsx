import React, { useEffect, useState } from "react";
import { Modal, Select, Alert, Popover } from "antd";
import { CalendarOutlined, DownOutlined, RightOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { Tecnico, Empresa, Sucursal } from "./tiposAgenda";
import { getAgendaEmpresaOptionLabel } from "./agendaEmpresaLabel";
import SeleccionarFechasCalendario from "./SeleccionarFechasCalendario";

export interface FechaLote {
  fecha: string; // YYYY-MM-DD
  horaInicio: string;
  horaFin: string;
}

export interface CrearVisitaManualProps {
  open: boolean;
  creating: boolean;
  errorText?: string;
  empresaId: number | null;
  sucursalId: number | null;
  tecnicoId: number | null;
  // Horario "por defecto": se usa para precargar cada fecha nueva que se
  // selecciona en el calendario. Cada fecha después se puede ajustar sola.
  horaInicio: string;
  horaFin: string;
  notas: string;
  empresasDisponibles: Empresa[];
  sucursalesDisponibles: Sucursal[];
  sucursalesLoading?: boolean;
  tecnicosDisponibles: Tecnico[];
  onEmpresaChange: (id: number) => void;
  onSucursalChange: (id: number | null) => void;
  onTecnicoChange: (id: number) => void;
  onHoraInicioChange: (v: string) => void;
  onHoraFinChange: (v: string) => void;
  onNotasChange: (v: string) => void;
  onOk: () => void;
  onCancel: () => void;
  fechasLote: FechaLote[];
  onFechasLoteChange: (fechas: FechaLote[]) => void;
}

export function CrearVisitaManual({
  open,
  creating,
  errorText,
  empresaId,
  sucursalId,
  tecnicoId,
  horaInicio,
  horaFin,
  notas,
  empresasDisponibles,
  sucursalesDisponibles,
  sucursalesLoading,
  tecnicosDisponibles,
  onEmpresaChange,
  onSucursalChange,
  onTecnicoChange,
  onHoraInicioChange,
  onHoraFinChange,
  onNotasChange,
  onOk,
  onCancel,
  fechasLote,
  onFechasLoteChange,
}: CrearVisitaManualProps) {
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);
  const [listaFechasAbierta, setListaFechasAbierta] = useState(false);

  function toggleFechaLote(fechaClave: string) {
    const existe = fechasLote.find((f) => f.fecha === fechaClave);
    if (existe) {
      onFechasLoteChange(fechasLote.filter((f) => f.fecha !== fechaClave));
    } else {
      onFechasLoteChange(
        [...fechasLote, { fecha: fechaClave, horaInicio: horaInicio || "", horaFin: horaFin || "" }].sort((a, b) =>
          a.fecha.localeCompare(b.fecha)
        )
      );
    }
  }

  function actualizarHorarioFechaLote(fechaClave: string, campo: "horaInicio" | "horaFin", valor: string) {
    onFechasLoteChange(fechasLote.map((f) => (f.fecha === fechaClave ? { ...f, [campo]: valor } : f)));
  }

  // Si una fecha quedó sin horario propio (ej: se precargó desde el calendario
  // principal antes de escribir la hora), se completa sola con el horario por
  // defecto apenas el usuario lo escribe — sin pisar horarios ya personalizados.
  useEffect(() => {
    if (!horaInicio && !horaFin) return;
    const necesitaCompletar = fechasLote.some((f) => (!f.horaInicio && horaInicio) || (!f.horaFin && horaFin));
    if (!necesitaCompletar) return;
    onFechasLoteChange(
      fechasLote.map((f) => ({
        ...f,
        horaInicio: f.horaInicio || horaInicio,
        horaFin: f.horaFin || horaFin,
      }))
    );
    // Se sincroniza deliberadamente solo con los valores por defecto: no queremos
    // reejecutar esto cuando el usuario edita una fecha puntual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horaInicio, horaFin]);

  const puedeCrear =
    empresaId !== null &&
    tecnicoId !== null &&
    fechasLote.length > 0 &&
    fechasLote.every((f) => f.horaInicio && f.horaFin);

  return (
    <Modal
      title="Agregar visita manual"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={creating}
      okText={fechasLote.length > 1 ? `Crear ${fechasLote.length} visitas` : "Crear visita"}
      cancelText="Cancelar"
      okButtonProps={{ disabled: !puedeCrear }}
      destroyOnHidden
      width={560}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
        {errorText ? (
          <Alert type="error" showIcon message={errorText} />
        ) : null}

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
          </div>
        )}

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
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>Hora inicio *</p>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => onHoraInicioChange(e.target.value)}
              style={{ width: "100%", padding: "4px 8px", borderRadius: 6, border: horaInicio ? "1px solid #d9d9d9" : "1px solid #f87171", fontSize: 14 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>Hora fin *</p>
            <input
              type="time"
              value={horaFin}
              onChange={(e) => onHoraFinChange(e.target.value)}
              style={{ width: "100%", padding: "4px 8px", borderRadius: 6, border: horaFin ? "1px solid #d9d9d9" : "1px solid #f87171", fontSize: 14 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>Seleccionar fechas</span>
          <Popover
            trigger="click"
            open={calendarioAbierto}
            onOpenChange={setCalendarioAbierto}
            placement="bottomLeft"
            getPopupContainer={() => document.body}
            content={
              <div style={{ width: 260 }}>
                <SeleccionarFechasCalendario
                  fechasSeleccionadas={fechasLote.map((f) => f.fecha)}
                  onToggleFecha={toggleFechaLote}
                />
              </div>
            }
          >
            <button
              type="button"
              aria-label="Abrir calendario"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                color: "#0891b2",
                background: calendarioAbierto ? "#e0f2fe" : "none",
                border: "1px solid #0891b2",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              <CalendarOutlined />
            </button>
          </Popover>
        </div>

        {fechasLote.length > 0 && (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 8 }}>
            <button
              type="button"
              onClick={() => setListaFechasAbierta((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: "100%",
                padding: "8px 10px",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 13,
                color: "#334155",
              }}
            >
              {listaFechasAbierta ? <DownOutlined style={{ fontSize: 10 }} /> : <RightOutlined style={{ fontSize: 10 }} />}
              {fechasLote.length} fecha{fechasLote.length === 1 ? "" : "s"} seleccionada
              {fechasLote.length === 1 ? "" : "s"} — ajusta el horario si algún día es distinto
            </button>
            {listaFechasAbierta && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  maxHeight: 220,
                  overflowY: "auto",
                  padding: "0 10px 10px",
                }}
              >
                {fechasLote.map((f) => (
                  <div key={f.fecha} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, width: 90, color: "#334155" }}>
                      {dayjs(f.fecha).format("DD/MM/YYYY")}
                    </span>
                    <input
                      type="time"
                      value={f.horaInicio}
                      onChange={(e) => actualizarHorarioFechaLote(f.fecha, "horaInicio", e.target.value)}
                      style={{ flex: 1, padding: "4px 8px", borderRadius: 6, border: f.horaInicio ? "1px solid #d9d9d9" : "1px solid #f87171", fontSize: 13 }}
                    />
                    <input
                      type="time"
                      value={f.horaFin}
                      onChange={(e) => actualizarHorarioFechaLote(f.fecha, "horaFin", e.target.value)}
                      style={{ flex: 1, padding: "4px 8px", borderRadius: 6, border: f.horaFin ? "1px solid #d9d9d9" : "1px solid #f87171", fontSize: 13 }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleFechaLote(f.fecha)}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
                      aria-label="Quitar fecha"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
