// src/components/modals-funnel/FunnelBoard.tsx
import { useState } from "react";
import { Alert, App, Button, Spin } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { EtapaOportunidadVenta, OportunidadFunnelItem } from "./types";
import { ORDEN_ETAPAS, getEtapaColumnClass, getEtapaColumnaVisible, getEtapaLabel, getOportunidadErrorCode, getOportunidadErrorMessage } from "./utils";
import OportunidadCard from "./OportunidadCard";

const ETAPAS_SET = new Set<string>(ORDEN_ETAPAS);
const ETAPAS_CIERRE = new Set<EtapaOportunidadVenta>(["GANADA", "PERDIDA", "POSTERGADA"]);

interface FunnelBoardProps {
  funnel: OportunidadFunnelItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectOportunidad: (oportunidad: OportunidadFunnelItem) => void;
  onCambiarEtapa: (id: number, etapa: EtapaOportunidadVenta) => Promise<unknown>;
  onReordenar: (id: number, indice: number) => Promise<unknown>;
  onRequiereCierre: (oportunidad: OportunidadFunnelItem, tipo: Extract<EtapaOportunidadVenta, "GANADA" | "PERDIDA" | "POSTERGADA">) => void;
  onBloqueoCotizacion: (oportunidad: OportunidadFunnelItem) => void;
}

export default function FunnelBoard({
  funnel,
  loading,
  error,
  onRetry,
  onSelectOportunidad,
  onCambiarEtapa,
  onReordenar,
  onRequiereCierre,
  onBloqueoCotizacion,
}: FunnelBoardProps) {
  const { notification } = App.useApp();
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  if (error) {
    return (
      <Alert
        type="error"
        message="No se pudo cargar el funnel"
        description={error}
        action={
          <Button size="small" icon={<ReloadOutlined />} onClick={onRetry}>
            Reintentar
          </Button>
        }
        showIcon
      />
    );
  }

  if (loading && funnel.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spin size="large" tip="Cargando funnel..." />
      </div>
    );
  }

  const columnas = ORDEN_ETAPAS.map((etapa) => ({
    etapa,
    oportunidades: funnel.filter((o) => getEtapaColumnaVisible(o.etapa) === etapa).sort((a, b) => a.orden - b.orden),
  }));

  const activeOportunidad = activeId != null ? funnel.find((o) => o.id === activeId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(Number(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const draggedId = Number(active.id);
    const dragged = funnel.find((o) => o.id === draggedId);
    if (!dragged) return;

    const overId = String(over.id);

    let etapaDestino: EtapaOportunidadVenta;
    let indiceDestino: number;

    if (ETAPAS_SET.has(overId)) {
      etapaDestino = overId as EtapaOportunidadVenta;
      indiceDestino = funnel.filter((o) => getEtapaColumnaVisible(o.etapa) === etapaDestino && o.id !== draggedId).length;
    } else {
      const overItem = funnel.find((o) => o.id === Number(overId));
      if (!overItem) return;
      etapaDestino = getEtapaColumnaVisible(overItem.etapa);
      const columnaDestino = funnel
        .filter((o) => getEtapaColumnaVisible(o.etapa) === etapaDestino && o.id !== draggedId)
        .sort((a, b) => a.orden - b.orden);
      indiceDestino = columnaDestino.findIndex((o) => o.id === overItem.id);
      if (indiceDestino < 0) indiceDestino = columnaDestino.length;
    }

    // Reordenamiento dentro de la misma columna
    if (etapaDestino === getEtapaColumnaVisible(dragged.etapa)) {
      const columnaActual = funnel.filter((o) => getEtapaColumnaVisible(o.etapa) === etapaDestino).sort((a, b) => a.orden - b.orden);
      const indiceActual = columnaActual.findIndex((o) => o.id === draggedId);
      if (indiceActual === indiceDestino) return;
      try {
        await onReordenar(draggedId, indiceDestino);
      } catch (err) {
        notification.error({
          message: "No se pudo reordenar",
          description: getOportunidadErrorMessage(err, "Ocurrió un error al reordenar la tarjeta."),
        });
      }
      return;
    }

    // Ganada/Perdida no se completan solo con drag and drop: se abre el modal de cierre.
    // No se aplica ningún cambio local, por lo que la tarjeta vuelve visualmente a su columna.
    if (ETAPAS_CIERRE.has(etapaDestino)) {
      onRequiereCierre(dragged, etapaDestino as Extract<EtapaOportunidadVenta, "GANADA" | "PERDIDA" | "POSTERGADA">);
      return;
    }

    try {
      await onCambiarEtapa(draggedId, etapaDestino);
    } catch (err) {
      const code = getOportunidadErrorCode(err);
      if (code === "COTIZACION_REQUERIDA") {
        onBloqueoCotizacion(dragged);
      }
      notification.error({
        message: "No se pudo cambiar de etapa",
        description: getOportunidadErrorMessage(err, "Ocurrió un error al cambiar de etapa."),
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columnas.map(({ etapa, oportunidades }) => (
          <FunnelColumn
            key={etapa}
            etapa={etapa}
            oportunidades={oportunidades}
            onSelectOportunidad={onSelectOportunidad}
          />
        ))}
      </div>

      <DragOverlay>
        {activeOportunidad ? (
          <div className="w-72 rotate-2 opacity-95">
            <OportunidadCard oportunidad={activeOportunidad} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface FunnelColumnProps {
  etapa: EtapaOportunidadVenta;
  oportunidades: OportunidadFunnelItem[];
  onSelectOportunidad: (oportunidad: OportunidadFunnelItem) => void;
}

function FunnelColumn({ etapa, oportunidades, onSelectOportunidad }: FunnelColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-lg border ${getEtapaColumnClass(etapa)} ${
        isOver ? "ring-2 ring-cyan-400" : ""
      }`}
    >
      <div className="flex items-center justify-between border-b border-black/5 px-3 py-2">
        <h3 className="text-sm font-semibold text-slate-700">{getEtapaLabel(etapa)}</h3>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-slate-600">
          {oportunidades.length}
        </span>
      </div>

      <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
        <SortableContext items={oportunidades.map((o) => String(o.id))} strategy={verticalListSortingStrategy}>
          {oportunidades.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-8 text-xs text-slate-400">
              Sin oportunidades
            </div>
          ) : (
            oportunidades.map((oportunidad) => (
              <SortableOportunidadCard key={oportunidad.id} oportunidad={oportunidad} onClick={onSelectOportunidad} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

function SortableOportunidadCard({
  oportunidad,
  onClick,
}: {
  oportunidad: OportunidadFunnelItem;
  onClick: (oportunidad: OportunidadFunnelItem) => void;
}) {
  const cerrada = oportunidad.etapa === "PERDIDA" || oportunidad.etapa === "POSTERGADA";
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: String(oportunidad.id),
    disabled: cerrada,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...(cerrada ? {} : attributes)} {...(cerrada ? {} : listeners)}>
      <OportunidadCard oportunidad={oportunidad} onClick={onClick} />
    </div>
  );
}
