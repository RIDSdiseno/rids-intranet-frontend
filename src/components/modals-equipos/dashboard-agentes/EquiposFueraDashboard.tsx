// src/components/modals-equipos/dashboard-agentes/EquiposFueraDashboard.tsx
//
// Secciones aparte del dashboard de agentes:
// 1) Equipos excluidos (dados de baja, vendidos o que no son PC), con conteo, explicación y listado.
// 2) Equipos EN_STOCK / EN_RIDS, que no están en uso por el cliente.
import { useMemo, useState } from "react";

import { ChevronDownIcon } from "@heroicons/react/24/outline";

import type {
    DashboardAgenteItem,
    DashboardExcluidos,
    DashboardFueraDeOperacion,
} from "./dashboard-agente.types";

const POR_PAGINA = 10;

const MOTIVO_LABEL: Record<string, string> = {
    DADO_DE_BAJA: "Dado de baja",
    VENDIDO: "Vendido",
    NO_ES_PC: "No es PC",
};

const ESTADO_AGENTE_LABEL: Record<string, string> = {
    ACTIVO: "Activo",
    SIN_CONEXION: "Sin conexión",
    SIN_AGENTE: "Sin agente",
};

const ESTADO_AGENTE_CLASS: Record<string, string> = {
    ACTIVO: "bg-emerald-50 text-emerald-700 border-emerald-200",
    SIN_CONEXION: "bg-amber-50 text-amber-700 border-amber-200",
    SIN_AGENTE: "bg-slate-50 text-slate-600 border-slate-200",
};

function etiqueta(valor: string | null | undefined): string {
    const texto = String(valor ?? "").replace(/_/g, " ").toLowerCase();
    return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "—";
}

function fecha(valor: string | null | undefined): string {
    if (!valor) return "—";
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("es-CL", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(d);
}

function Paginacion({
    pagina,
    total,
    onChange,
}: {
    pagina: number;
    total: number;
    onChange: (p: number) => void;
}) {
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    if (paginas <= 1) return null;

    return (
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
            <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => onChange(pagina - 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
            >
                Anterior
            </button>
            <span>
                Página {pagina} de {paginas}
            </span>
            <button
                type="button"
                disabled={pagina >= paginas}
                onClick={() => onChange(pagina + 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
            >
                Siguiente
            </button>
        </div>
    );
}

function Encabezado({
    titulo,
    total,
    descripcion,
    abierto,
    onToggle,
}: {
    titulo: string;
    total: number;
    descripcion: string;
    abierto: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-start justify-between gap-3 p-4 text-left"
        >
            <div className="min-w-0">
                <h3 className="font-semibold text-slate-900">
                    {titulo}{" "}
                    <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {total}
                    </span>
                </h3>
                <p className="mt-1 text-xs text-slate-500">{descripcion}</p>
            </div>
            <ChevronDownIcon
                className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform ${abierto ? "rotate-180" : ""}`}
            />
        </button>
    );
}

/* =========================================================
   1) EXCLUIDOS
========================================================= */

function EquiposExcluidos({ excluidos }: { excluidos: DashboardExcluidos }) {
    const [abierto, setAbierto] = useState(false);
    const [pagina, setPagina] = useState(1);

    const visibles = useMemo(
        () =>
            excluidos.equipos.slice(
                (pagina - 1) * POR_PAGINA,
                pagina * POR_PAGINA,
            ),
        [excluidos.equipos, pagina],
    );

    if (excluidos.total === 0) return null;

    return (
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Encabezado
                titulo="Equipos excluidos del dashboard"
                total={excluidos.total}
                descripcion="No se cuentan en los indicadores, la cobertura ni la tabla, porque están dados de baja, fueron vendidos o no son PC (no pueden ejecutar el agente)."
                abierto={abierto}
                onToggle={() => setAbierto((v) => !v)}
            />

            {abierto && (
                <>
                    <div className="grid grid-cols-1 gap-3 border-t border-slate-200 p-4 md:grid-cols-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Dados de baja
                            </div>
                            <div className="mt-0.5 text-lg font-semibold text-slate-900">
                                {excluidos.dadosDeBaja.total}
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                                Ya no están en uso. {excluidos.dadosDeBaja.conAgente} tuvieron
                                agente instalado.
                            </div>
                            {excluidos.dadosDeBaja.conAgenteActivo > 0 && (
                                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                                    {excluidos.dadosDeBaja.conAgenteActivo} siguen reportando:
                                    el equipo aún está encendido. Revisa si realmente está dado
                                    de baja.
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Vendidos
                            </div>
                            <div className="mt-0.5 text-lg font-semibold text-slate-900">
                                {excluidos.vendidos?.total ?? 0}
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                                Ya no pertenecen al cliente. {excluidos.vendidos?.conAgente ?? 0}{" "}
                                tuvieron agente instalado.
                            </div>
                            {(excluidos.vendidos?.conAgenteActivo ?? 0) > 0 && (
                                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                                    {excluidos.vendidos?.conAgenteActivo} siguen reportando:
                                    el agente sigue instalado en un equipo vendido.
                                    Conviene desinstalarlo.
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                No son PC
                            </div>
                            <div className="mt-0.5 text-lg font-semibold text-slate-900">
                                {excluidos.noPc.total}
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                                {excluidos.noPc.porTipo.length > 0
                                    ? excluidos.noPc.porTipo
                                        .map((t) => `${etiqueta(t.tipo)}: ${t.cantidad}`)
                                        .join(" · ")
                                    : "Sin equipos de este tipo."}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto border-t border-slate-200">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-2">Equipo</th>
                                    <th className="px-4 py-2">Tipo</th>
                                    <th className="px-4 py-2">Estado</th>
                                    <th className="px-4 py-2">Empresa</th>
                                    <th className="px-4 py-2">Hostname</th>
                                    <th className="px-4 py-2">Último reporte</th>
                                    <th className="px-4 py-2">Motivo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibles.map((e) => (
                                    <tr key={e.idEquipo}>
                                        <td className="px-4 py-2">
                                            <div className="font-medium text-slate-800">
                                                {e.marca} {e.modelo}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                #{e.idEquipo} · {e.serial ?? "Sin serial"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">{etiqueta(e.tipo)}</td>
                                        <td className="px-4 py-2">{etiqueta(e.estadoEquipo)}</td>
                                        <td className="px-4 py-2">{e.empresa?.nombre ?? "Sin empresa"}</td>
                                        <td className="px-4 py-2">{e.hostname ?? "—"}</td>
                                        <td className="px-4 py-2">
                                            {fecha(e.ultimaConexion)}
                                            {e.estadoAgente === "ACTIVO" &&
                                                (e.motivos.includes("DADO_DE_BAJA") ||
                                                    e.motivos.includes("VENDIDO")) && (
                                                    <span className="ml-1 rounded border border-amber-200 bg-amber-50 px-1.5 text-[11px] text-amber-700">
                                                        sigue reportando
                                                    </span>
                                                )}
                                        </td>
                                        <td className="px-4 py-2">
                                            {e.motivos.map((m) => MOTIVO_LABEL[m] ?? m).join(" y ")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Paginacion
                        pagina={pagina}
                        total={excluidos.equipos.length}
                        onChange={setPagina}
                    />
                </>
            )}
        </section>
    );
}

/* =========================================================
   2) EN STOCK / EN RIDS
========================================================= */

function EquiposFueraDeOperacion({
    fuera,
}: {
    fuera: DashboardFueraDeOperacion;
}) {
    const [abierto, setAbierto] = useState(false);
    const [pagina, setPagina] = useState(1);

    const visibles: DashboardAgenteItem[] = useMemo(
        () =>
            fuera.items.slice(
                (pagina - 1) * POR_PAGINA,
                pagina * POR_PAGINA,
            ),
        [fuera.items, pagina],
    );

    if (fuera.total === 0) return null;

    return (
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Encabezado
                titulo="Equipos en stock / en RIDS"
                total={fuera.total}
                descripcion={`No están en uso por el cliente, así que no entran en la cobertura ni en los indicadores. En stock: ${fuera.enStock} · En RIDS: ${fuera.enRids}.`}
                abierto={abierto}
                onToggle={() => setAbierto((v) => !v)}
            />

            {abierto && (
                <>
                    <div className="overflow-x-auto border-t border-slate-200">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-2">Equipo</th>
                                    <th className="px-4 py-2">Estado</th>
                                    <th className="px-4 py-2">Empresa</th>
                                    <th className="px-4 py-2">Hostname</th>
                                    <th className="px-4 py-2">Agente</th>
                                    <th className="px-4 py-2">Último reporte</th>
                                    <th className="px-4 py-2">Versión</th>
                                    <th className="px-4 py-2">OneDrive</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibles.map((item) => (
                                    <tr key={item.idEquipo}>
                                        <td className="px-4 py-2">
                                            <div className="font-medium text-slate-800">
                                                {item.marca} {item.modelo}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                #{item.idEquipo} · {item.serial ?? "Sin serial"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">{etiqueta(item.estadoEquipo)}</td>
                                        <td className="px-4 py-2">{item.empresa?.nombre ?? "Sin empresa"}</td>
                                        <td className="px-4 py-2">{item.agente.hostname ?? "—"}</td>
                                        <td className="px-4 py-2">
                                            <span
                                                className={`rounded-full border px-2 py-0.5 text-xs ${ESTADO_AGENTE_CLASS[item.agente.estado] ?? ""}`}
                                            >
                                                {ESTADO_AGENTE_LABEL[item.agente.estado] ?? item.agente.estado}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">{fecha(item.agente.ultimaConexion)}</td>
                                        <td className="px-4 py-2">
                                            {item.agente.version ?? "—"}
                                            {item.agente.versionDesactualizada && (
                                                <span className="ml-1 rounded border border-amber-200 bg-amber-50 px-1.5 text-[11px] text-amber-700">
                                                    anterior
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">{etiqueta(item.oneDrive.estado)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Paginacion
                        pagina={pagina}
                        total={fuera.items.length}
                        onChange={setPagina}
                    />
                </>
            )}
        </section>
    );
}

export function EquiposFueraDashboard({
    excluidos,
    fueraDeOperacion,
}: {
    excluidos?: DashboardExcluidos | undefined;
    fueraDeOperacion?: DashboardFueraDeOperacion | undefined;
}) {
    if (!excluidos && !fueraDeOperacion) return null;

    return (
        <>
            {fueraDeOperacion && <EquiposFueraDeOperacion fuera={fueraDeOperacion} />}
            {excluidos && <EquiposExcluidos excluidos={excluidos} />}
        </>
    );
}