// src/components/modals-funnel/FunnelCalendar.tsx
// Vista de calendario mensual: ubica cada oportunidad en el día de su
// "próxima acción" comercial (fechaProximaAccion), inspirado en el calendario
// de Beck. No reemplaza al tablero — es otra forma de ver los mismos datos ya
// filtrados (mismo buscador/filtro de prioridad que el tablero).
import { useMemo, useState } from "react";
import { Button, Select } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import type { OportunidadFunnelItem } from "./types";
import { getEtapaLabel } from "./utils";

interface FunnelCalendarProps {
  funnel: OportunidadFunnelItem[];
  loading: boolean;
  onSelectOportunidad: (oportunidad: OportunidadFunnelItem) => void;
}

const DIAS_SEMANA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

type CriterioCalendario = "proximaAccion" | "fechaProbableCierre" | "fechaCierre";

const CRITERIOS: { value: CriterioCalendario; label: string; descripcion: string }[] = [
  {
    value: "proximaAccion",
    label: "Próximas acciones",
    descripcion: "Oportunidades según próxima acción comercial.",
  },
  {
    value: "fechaProbableCierre",
    label: "Fecha probable de cierre",
    descripcion: "Oportunidades según la fecha estimada de cierre.",
  },
  {
    value: "fechaCierre",
    label: "Fecha de cierre real",
    descripcion: "Oportunidades ganadas o perdidas según su fecha real de cierre.",
  },
];

function fechaSegunCriterio(item: OportunidadFunnelItem, criterio: CriterioCalendario): string | null {
  if (criterio === "proximaAccion") return item.fechaProximaAccion;
  if (criterio === "fechaProbableCierre") return item.fechaProbableCierre;
  return item.fechaCierre;
}

function bloqueClase(etapa: OportunidadFunnelItem["etapa"]): string {
  if (etapa === "PERDIDA") return "bg-rose-600 hover:bg-rose-700";
  if (etapa === "POSTERGADA") return "bg-orange-500 hover:bg-orange-600";
  return "bg-cyan-600 hover:bg-cyan-700";
}

export default function FunnelCalendar({ funnel, loading, onSelectOportunidad }: FunnelCalendarProps) {
  const [mesActual, setMesActual] = useState<Dayjs>(dayjs());
  const [criterio, setCriterio] = useState<CriterioCalendario>("proximaAccion");

  const semanas = useMemo(() => {
    const inicioMes = mesActual.startOf("month");
    const finMes = mesActual.endOf("month");
    // La grilla siempre parte un domingo y termina un sábado, incluyendo días
    // "de relleno" del mes anterior/siguiente (se muestran atenuados).
    const inicioGrilla = inicioMes.startOf("week");
    const finGrilla = finMes.endOf("week");

    const dias: Dayjs[] = [];
    let cursor = inicioGrilla;
    while (cursor.isBefore(finGrilla) || cursor.isSame(finGrilla, "day")) {
      dias.push(cursor);
      cursor = cursor.add(1, "day");
    }

    const filas: Dayjs[][] = [];
    for (let i = 0; i < dias.length; i += 7) {
      filas.push(dias.slice(i, i + 7));
    }
    return filas;
  }, [mesActual]);

  const oportunidadesPorDia = useMemo(() => {
    const mapa = new Map<string, OportunidadFunnelItem[]>();
    for (const item of funnel) {
      const fecha = fechaSegunCriterio(item, criterio);
      if (!fecha) continue;
      const clave = dayjs(fecha).format("YYYY-MM-DD");
      const lista = mapa.get(clave) ?? [];
      lista.push(item);
      mapa.set(clave, lista);
    }
    return mapa;
  }, [funnel, criterio]);

  const criterioActual = CRITERIOS.find((c) => c.value === criterio)!;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Calendario</h3>
          <p className="text-xs text-slate-400">{criterioActual.descripcion}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-500">Ver calendario por:</label>
          <Select
            size="small"
            className="w-56"
            classNames={{ popup: { root: "motivo-select-dropdown" } }}
            popupMatchSelectWidth={260}
            value={criterio}
            onChange={setCriterio}
            options={CRITERIOS.map((c) => ({ value: c.value, label: c.label }))}
          />
          <Button size="small" icon={<LeftOutlined />} onClick={() => setMesActual((m) => m.subtract(1, "month"))} />
          <Button size="small" onClick={() => setMesActual(dayjs())}>
            Hoy
          </Button>
          <Button size="small" icon={<RightOutlined />} onClick={() => setMesActual((m) => m.add(1, "month"))} />
        </div>
      </div>

      <div className="mb-2 text-center text-base font-semibold capitalize text-slate-700">
        {mesActual.format("MMMM [de] YYYY")}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-xs">
          <thead>
            <tr>
              {DIAS_SEMANA.map((dia) => (
                <th key={dia} className="border-b border-slate-200 py-2 text-center font-medium uppercase text-slate-400">
                  {dia}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {semanas.map((semana, i) => (
              <tr key={i}>
                {semana.map((dia) => {
                  const fueraDeMes = !dia.isSame(mesActual, "month");
                  const esHoy = dia.isSame(dayjs(), "day");
                  const items = oportunidadesPorDia.get(dia.format("YYYY-MM-DD")) ?? [];
                  return (
                    <td
                      key={dia.format("YYYY-MM-DD")}
                      className={`h-24 min-w-[100px] align-top border border-slate-100 p-1 ${
                        esHoy ? "bg-amber-50" : fueraDeMes ? "bg-slate-50" : "bg-white"
                      }`}
                    >
                      <div className={`mb-1 text-right ${fueraDeMes ? "text-slate-300" : "text-slate-500"}`}>
                        {dia.date()}
                      </div>
                      <div className="space-y-1">
                        {items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => onSelectOportunidad(item)}
                            className={`w-full rounded px-1.5 py-1 text-left text-[10px] leading-tight text-white transition ${bloqueClase(
                              item.etapa
                            )}`}
                          >
                            <div className="truncate font-semibold">{item.titulo}</div>
                            {item.entidad?.nombre && <div className="truncate opacity-90">{item.entidad.nombre}</div>}
                            <div className="truncate opacity-80">{getEtapaLabel(item.etapa)}</div>
                          </button>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <div className="mt-3 text-center text-xs text-slate-400">Actualizando…</div>}
    </div>
  );
}
