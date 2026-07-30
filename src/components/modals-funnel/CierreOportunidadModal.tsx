// src/components/modals-funnel/CierreOportunidadModal.tsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { App, DatePicker, Input, InputNumber, Select } from "antd";
import dayjs, { Dayjs } from "dayjs";
import type { CambiarEtapaPayload, EtapaOportunidadVenta, OportunidadDetalle, OportunidadFunnelItem } from "./types";
import { getOportunidadErrorMessage } from "./utils";

const MOTIVOS_PERDIDA = [
  "Precio muy alto frente a otras opciones",
  "Cliente eligió otro proveedor",
  "Presupuesto no aprobado / proyecto cancelado",
  "Cliente dejó de responder",
  "Resolvió el problema con soporte interno propio",
  "Encontró un proveedor más económico para los equipos",
  "Optó por otro desarrollador/plataforma para su sitio web",
  "Solución técnica no se ajustaba a lo solicitado",
  "Otro",
].map((value) => ({ value, label: value }));

const MOTIVOS_POSTERGACION = [
  "Cliente pidió retomar más adelante",
  "Presupuesto no aprobado por el momento",
  "Proyecto sin fecha de inicio definida",
  "Esperando disponibilidad de equipos/stock",
  "Cliente evaluando otras opciones",
  "Requiere levantamiento técnico adicional",
  "Pausa interna del cliente",
  "Otro",
].map((value) => ({ value, label: value }));

type TipoCierre = Extract<EtapaOportunidadVenta, "GANADA" | "PERDIDA" | "POSTERGADA">;

interface CierreOportunidadModalProps {
  open: boolean;
  tipo: TipoCierre | null;
  oportunidad: OportunidadFunnelItem | OportunidadDetalle | null;
  onClose: () => void;
  onConfirm: (id: number, payload: CambiarEtapaPayload) => Promise<unknown>;
  onSuccess: () => void;
}

function normalizarMotivo(motivo: string, detalleOtro: string): string {
  if (motivo !== "Otro") return motivo.trim();
  const detalle = detalleOtro.trim();
  return detalle ? `Otro: ${detalle}` : "";
}

export default function CierreOportunidadModal({
  open,
  tipo,
  oportunidad,
  onClose,
  onConfirm,
  onSuccess,
}: CierreOportunidadModalProps) {
  const { notification } = App.useApp();
  const [fechaCierre, setFechaCierre] = useState<Dayjs | null>(dayjs());
  const [fechaReactivacion, setFechaReactivacion] = useState<Dayjs | null>(null);
  const [montoFinal, setMontoFinal] = useState<number | undefined>(undefined);
  const [motivo, setMotivo] = useState("");
  const [detalleOtro, setDetalleOtro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFechaCierre(dayjs());
      setFechaReactivacion(null);
      setMontoFinal(undefined);
      setMotivo("");
      setDetalleOtro("");
      setError(null);
    }
  }, [open, oportunidad?.id]);

  if (!open || !tipo || !oportunidad) return null;

  const oportunidadActual = oportunidad;
  const esGanada = tipo === "GANADA";
  const esPerdida = tipo === "PERDIDA";
  const esPostergada = tipo === "POSTERGADA";

  async function handleConfirm() {
    if (esGanada && !fechaCierre) {
      setError("La fecha de cierre es obligatoria.");
      return;
    }

    const motivoNormalizado = normalizarMotivo(motivo, detalleOtro);
    if ((esPerdida || esPostergada) && !motivoNormalizado) {
      setError(esPerdida ? "El motivo de pérdida es obligatorio." : "El motivo de postergación es obligatorio.");
      return;
    }
    if (esPerdida && !fechaCierre) {
      setError("La fecha de cierre es obligatoria.");
      return;
    }
    if (esPostergada && !fechaReactivacion) {
      setError("La fecha de reactivación es obligatoria.");
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      const payload: CambiarEtapaPayload = esGanada
        ? { etapa: "GANADA", fechaCierre: fechaCierre!.toISOString(), montoFinal: montoFinal ?? null }
        : esPerdida
        ? { etapa: "PERDIDA", fechaCierre: fechaCierre!.toISOString(), motivoPerdida: motivoNormalizado }
        : { etapa: "POSTERGADA", fechaReactivacion: fechaReactivacion!.toISOString(), motivoPostergacion: motivoNormalizado };

      await onConfirm(oportunidadActual.id, payload);

      notification.success({
        message: esGanada
          ? "Oportunidad marcada como ganada"
          : esPerdida
          ? "Oportunidad marcada como pérdida"
          : "Oportunidad marcada como postergada",
        description: `${oportunidadActual.codigo} - ${oportunidadActual.titulo}`,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(getOportunidadErrorMessage(err, "No se pudo actualizar la oportunidad."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative"
      >
        <div className="p-6">
          <h2 className={`text-lg font-bold mb-1 ${esGanada ? "text-emerald-700" : esPerdida ? "text-rose-700" : "text-orange-700"}`}>
            {esGanada ? "Marcar oportunidad como ganada" : esPerdida ? "Marcar oportunidad como pérdida" : "Marcar oportunidad como postergada"}
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            {oportunidadActual.codigo} - {oportunidadActual.titulo}
          </p>

          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl" aria-label="Cerrar">
            ✕
          </button>

          <div className="space-y-4">
            {(esGanada || esPerdida) && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Fecha de cierre <span className="text-rose-500">*</span>
                </label>
                <DatePicker className="w-full" format="DD-MM-YYYY" value={fechaCierre} onChange={setFechaCierre} />
              </div>
            )}

            {esGanada && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Monto final (opcional)</label>
                <InputNumber className="w-full" min={0} value={montoFinal} onChange={(v) => setMontoFinal(v ?? undefined)} />
              </div>
            )}

            {(esPerdida || esPostergada) && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {esPerdida ? "Motivo de pérdida" : "Motivo de postergación"} <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    className="w-full"
                    classNames={{ popup: { root: "motivo-select-dropdown" } }}
                    placeholder="Selecciona un motivo"
                    value={motivo || undefined}
                    onChange={(value) => {
                      setMotivo(value ?? "");
                      setDetalleOtro("");
                    }}
                    options={esPerdida ? MOTIVOS_PERDIDA : MOTIVOS_POSTERGACION}
                  />
                </div>

                {motivo === "Otro" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Especifica el motivo</label>
                    <Input value={detalleOtro} onChange={(e) => setDetalleOtro(e.target.value)} placeholder="Describe el motivo…" />
                  </div>
                )}
              </>
            )}

            {esPostergada && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Fecha de reactivación <span className="text-rose-500">*</span>
                </label>
                <DatePicker className="w-full" format="DD-MM-YYYY" value={fechaReactivacion} onChange={setFechaReactivacion} />
              </div>
            )}

            {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button onClick={onClose} disabled={enviando} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition">
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={enviando}
              className={`px-4 py-2 rounded-lg text-sm text-white transition disabled:opacity-60 ${
                esGanada ? "bg-emerald-600 hover:bg-emerald-700" : esPerdida ? "bg-rose-600 hover:bg-rose-700" : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              {enviando ? "Guardando…" : esGanada ? "Confirmar ganada" : esPerdida ? "Confirmar pérdida" : "Confirmar postergada"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}