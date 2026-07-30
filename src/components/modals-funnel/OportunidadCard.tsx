// src/components/modals-funnel/OportunidadCard.tsx
import { Tag } from "antd";
import { ClockCircleOutlined, FileTextOutlined, UserOutlined } from "@ant-design/icons";
import type { OportunidadFunnelItem } from "./types";
import {
  esAccionVencida,
  formatFecha,
  formatMonto,
  getPrioridadLabel,
  getPrioridadTagColor,
} from "./utils";

interface OportunidadCardProps {
  oportunidad: OportunidadFunnelItem;
  onClick: (oportunidad: OportunidadFunnelItem) => void;
}

export default function OportunidadCard({ oportunidad, onClick }: OportunidadCardProps) {
  const vencida = esAccionVencida(oportunidad.fechaProximaAccion, oportunidad.etapa);
  const esPerdida = oportunidad.etapa === "PERDIDA";
  const esPostergada = oportunidad.etapa === "POSTERGADA";
  const estaCerradaNoGanada = esPerdida || esPostergada;

  return (
    <article
      onClick={() => onClick(oportunidad)}
      className={`cursor-pointer overflow-hidden rounded-lg border bg-white shadow-sm transition hover:shadow-md ${
        esPerdida
          ? "border-rose-300 hover:border-rose-500"
          : esPostergada
          ? "border-orange-300 hover:border-orange-500"
          : "border-slate-200 hover:border-cyan-300"
      }`}
    >
      {esPerdida && (
        <div className="bg-rose-600 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-white select-none">
          --- PERDIDA ---
        </div>
      )}
      {esPostergada && (
        <div className="bg-orange-500 px-2 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-white select-none">
          --- POSTERGADA ---
        </div>
      )}
      <div className="p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-slate-400">{oportunidad.codigo}</span>
        <Tag color={getPrioridadTagColor(oportunidad.prioridad)} className="!m-0">
          {getPrioridadLabel(oportunidad.prioridad)}
        </Tag>
      </div>

      <h4 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-800">{oportunidad.titulo}</h4>

      {oportunidad.entidad?.nombre && (
        <p className="mt-0.5 truncate text-xs text-slate-500">{oportunidad.entidad.nombre}</p>
      )}
      {oportunidad.proyecto && (
        <p className="truncate text-xs text-slate-400">{oportunidad.proyecto}</p>
      )}

      <div className="mt-2 flex items-center justify-between text-sm font-medium text-slate-700">
        <span>{formatMonto(oportunidad.montoEstimado, oportunidad.moneda)}</span>
        {oportunidad.responsable?.nombre && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <UserOutlined /> {oportunidad.responsable.nombre.split(" ")[0]}
          </span>
        )}
      </div>

      {!estaCerradaNoGanada && (oportunidad.proximaAccion || oportunidad.fechaProximaAccion) && (
        <div
          className={`mt-2 flex items-center gap-1 rounded px-2 py-1 text-xs ${
            vencida ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-600"
          }`}
        >
          <ClockCircleOutlined />
          <span className="truncate">{oportunidad.proximaAccion || "Próxima acción"}</span>
          {oportunidad.fechaProximaAccion && (
            <span className="ml-auto shrink-0">{formatFecha(oportunidad.fechaProximaAccion)}</span>
          )}
        </div>
      )}

      {oportunidad.cantidadCotizaciones > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
          <FileTextOutlined />
          <span>
            {oportunidad.cantidadCotizaciones}{" "}
            {oportunidad.cantidadCotizaciones === 1 ? "cotización" : "cotizaciones"}
            {oportunidad.cotizacionPrincipal ? ` · ${oportunidad.cotizacionPrincipal.estado}` : ""}
          </span>
        </div>
      )}
      </div>
    </article>
  );
}
