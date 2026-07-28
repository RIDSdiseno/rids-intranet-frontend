// src/components/modals-agenda/SeleccionarFechasCalendario.tsx
// Mini calendario mensual para elegir varias fechas sueltas con un clic
// (ej: "hoy 28 y el 30 va a tal empresa"), en vez de tener que agregar una
// visita manual a la vez. No asume ningún patrón semanal — cada fecha se
// selecciona individualmente. Semana empieza en lunes y hay atajo "Hoy",
// igual que el panel de fecha nativo de antd, para que se sienta consistente.
import { useMemo, useState } from "react";
import { Button } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";

interface SeleccionarFechasCalendarioProps {
  fechasSeleccionadas: string[]; // YYYY-MM-DD
  onToggleFecha: (fecha: string) => void;
}

const DIAS_SEMANA = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];

export default function SeleccionarFechasCalendario({
  fechasSeleccionadas,
  onToggleFecha,
}: SeleccionarFechasCalendarioProps) {
  const [mesActual, setMesActual] = useState<Dayjs>(dayjs());
  const hoy = dayjs();

  const semanas = useMemo(() => {
    const inicioMes = mesActual.startOf("month");
    const finMes = mesActual.endOf("month");
    // dayjs().day() es 0=domingo..6=sábado; se convierte a offset lunes=0..domingo=6.
    const offsetInicio = (inicioMes.day() + 6) % 7;
    const offsetFin = (finMes.day() + 6) % 7;
    const inicioGrilla = inicioMes.subtract(offsetInicio, "day");
    const finGrilla = finMes.add(6 - offsetFin, "day");

    const dias: Dayjs[] = [];
    let cursor = inicioGrilla;
    while (cursor.isBefore(finGrilla) || cursor.isSame(finGrilla, "day")) {
      dias.push(cursor);
      cursor = cursor.add(1, "day");
    }
    const filas: Dayjs[][] = [];
    for (let i = 0; i < dias.length; i += 7) filas.push(dias.slice(i, i + 7));
    return filas;
  }, [mesActual]);

  const seleccionadas = new Set(fechasSeleccionadas);

  return (
    <div className="rounded-lg border border-slate-200 p-2">
      <div className="mb-2 flex items-center justify-between">
        <Button size="small" icon={<LeftOutlined />} onClick={() => setMesActual((m) => m.subtract(1, "month"))} />
        <span className="text-sm font-medium capitalize text-slate-700">{mesActual.format("MMMM [de] YYYY")}</span>
        <Button size="small" icon={<RightOutlined />} onClick={() => setMesActual((m) => m.add(1, "month"))} />
      </div>
      <table className="w-full table-fixed border-collapse text-xs">
        <thead>
          <tr>
            {DIAS_SEMANA.map((d) => (
              <th key={d} className="pb-1 text-center font-medium uppercase text-slate-400">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanas.map((semana, i) => (
            <tr key={i}>
              {semana.map((dia) => {
                const clave = dia.format("YYYY-MM-DD");
                const fueraDeMes = !dia.isSame(mesActual, "month");
                const esHoy = dia.isSame(hoy, "day");
                const seleccionada = seleccionadas.has(clave);
                return (
                  <td key={clave} className="p-0.5 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleFecha(clave)}
                      className={`h-7 w-full rounded transition ${
                        seleccionada
                          ? "bg-cyan-600 text-white font-semibold"
                          : esHoy
                          ? "bg-amber-50 text-slate-700 hover:bg-cyan-100"
                          : fueraDeMes
                          ? "text-slate-300 hover:bg-slate-100"
                          : "text-slate-700 hover:bg-cyan-100"
                      }`}
                    >
                      {dia.date()}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-1 flex justify-end border-t border-slate-100 pt-1.5">
        <button
          type="button"
          onClick={() => setMesActual(dayjs())}
          className="text-xs font-medium text-cyan-700 hover:underline"
        >
          Hoy
        </button>
      </div>
    </div>
  );
}
