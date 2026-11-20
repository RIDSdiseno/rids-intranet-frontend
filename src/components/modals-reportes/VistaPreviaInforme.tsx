// src/components/modals-reportes/VistaPreviaInforme.tsx
// Vista previa del informe Word: mismas secciones, mismo orden y mismos cálculos
// (UtilsReportes + buildReporteExportData) que exportDOCX, para que lo que se ve
// aquí coincida con lo que trae el documento. Los gráficos se muestran como barras.
import React, { useMemo, useState } from "react";

import type { ReporteGeneralData } from "./typesReportes";
import {
    TEXTO_FIJO,
    contarExtras,
    contarMantenimientos,
    contarMantenimientosPorFecha,
    contarMantenimientosPorUsuario,
    contarTiposVisita,
    calcularDistribucionServicios,
    obtenerTopSolicitantesTickets,
    obtenerTopUsuariosGeneral,
} from "./UtilsReportes";
import { buildReporteExportData } from "./buildReporteExportData";

type Fila = Record<string, string | number>;

const FILAS_INICIALES = 8;

const estadoTicket = (status?: string | null) => {
    switch ((status || "").toUpperCase()) {
        case "NEW": return "Nuevo";
        case "OPEN": return "Abierto";
        case "PENDING": return "Pendiente";
        case "ON_HOLD": return "En espera";
        case "RESOLVED": return "Resuelto";
        case "CLOSED": return "Cerrado";
        default: return status ? String(status) : "—";
    }
};

const fechaHora = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString("es-CL") : "—";

/* ── Piezas de UI ─────────────────────────────────────────────── */

const Seccion: React.FC<{
    numero: number;
    titulo: string;
    resumen?: string;
    children: React.ReactNode;
    abierta?: boolean;
}> = ({ numero, titulo, resumen, children, abierta = false }) => (
    <details open={abierta} className="group border border-slate-200 rounded-xl bg-white">
        <summary className="flex items-center justify-between gap-4 cursor-pointer select-none px-5 py-3">
            <span className="font-semibold text-slate-800">
                <span className="text-slate-400 mr-2">{numero}.</span>
                {titulo}
            </span>
            {resumen && <span className="text-xs text-slate-500 text-right">{resumen}</span>}
        </summary>
        <div className="px-5 pb-5 pt-1 space-y-5 border-t border-slate-100">{children}</div>
    </details>
);

const Subtitulo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h5 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{children}</h5>
);

const Texto: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-sm text-slate-600 leading-relaxed">{children}</p>
);

const SinDatos: React.FC<{ texto?: string }> = ({ texto = "Sin datos para este período." }) => (
    <p className="text-sm italic text-slate-400">{texto}</p>
);

/** Reemplaza al gráfico del Word: barras horizontales proporcionales. */
const Barras: React.FC<{ filas: { etiqueta: string; valor: number }[]; maximoFilas?: number }> = ({
    filas,
    maximoFilas = 15,
}) => {
    const visibles = filas.filter((f) => f.valor > 0).slice(0, maximoFilas);
    if (visibles.length === 0) return <SinDatos />;
    const max = Math.max(...visibles.map((f) => f.valor), 1);

    return (
        <div className="space-y-1.5">
            {visibles.map((f) => (
                <div key={f.etiqueta} className="grid grid-cols-[minmax(120px,220px)_1fr_48px] items-center gap-3 text-sm">
                    <span className="truncate text-slate-600" title={f.etiqueta}>{f.etiqueta}</span>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-slate-500" style={{ width: `${(f.valor / max) * 100}%` }} />
                    </div>
                    <span className="text-right tabular-nums font-medium text-slate-800">{f.valor}</span>
                </div>
            ))}
            {filas.filter((f) => f.valor > 0).length > maximoFilas && (
                <p className="text-xs text-slate-400">Se muestran los primeros {maximoFilas}.</p>
            )}
        </div>
    );
};

/** Tabla con las mismas columnas del Word; muestra 8 filas y permite expandir. */
const Tabla: React.FC<{ columnas: string[]; filas: Fila[]; alinearDerecha?: string[] }> = ({
    columnas,
    filas,
    alinearDerecha = [],
}) => {
    const [todas, setTodas] = useState(false);
    if (filas.length === 0) return <SinDatos />;

    const visibles = todas ? filas : filas.slice(0, FILAS_INICIALES);

    return (
        <div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-xs">
                    <thead>
                        <tr className="bg-slate-100 text-slate-700">
                            {columnas.map((c) => (
                                <th
                                    key={c}
                                    className={`px-3 py-2 font-semibold whitespace-nowrap ${alinearDerecha.includes(c) ? "text-right" : "text-left"}`}
                                >
                                    {c}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visibles.map((fila, i) => (
                            <tr key={i} className="border-t border-slate-100">
                                {columnas.map((c) => (
                                    <td
                                        key={c}
                                        className={`px-3 py-1.5 text-slate-700 ${alinearDerecha.includes(c) ? "text-right tabular-nums" : ""}`}
                                    >
                                        {fila[c] === undefined || fila[c] === "" ? "—" : String(fila[c])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filas.length > FILAS_INICIALES && (
                <button
                    type="button"
                    onClick={() => setTodas((v) => !v)}
                    className="mt-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                    {todas ? "Mostrar menos" : `Ver las ${filas.length} filas`}
                </button>
            )}
        </div>
    );
};

/* ── Componente principal ─────────────────────────────────────── */

interface Props {
    data: ReporteGeneralData;
    empresaNombre: string;
    periodoTexto: string;
    /** Texto de «Análisis y recomendaciones» (generado con IA), si ya existe. */
    recomendaciones?: string;
}

export const VistaPreviaInforme: React.FC<Props> = ({ data, empresaNombre, periodoTexto, recomendaciones }) => {
    const calc = useMemo(() => {
        const sMap = new Map<number, string>();
        for (const s of data.solicitantes) {
            if (typeof s.id_solicitante === "number") sMap.set(s.id_solicitante, s.nombre ?? "");
        }

        const marcas: Record<string, number> = {};
        for (const eq of data.equipos) {
            const marca = eq.marca?.trim() || "Sin marca";
            marcas[marca] = (marcas[marca] || 0) + 1;
        }

        const distribucion = calcularDistribucionServicios(data.visitas);

        return {
            exportData: buildReporteExportData({ data, periodoTexto, empresaNombre }),
            mantPorFecha: contarMantenimientosPorFecha(data.visitas),
            tiposVisita: contarTiposVisita(data.visitas),
            actividades: contarMantenimientos(data.visitas),
            distribucion: distribucion.labels.map((l, i) => ({ etiqueta: l, valor: Number(distribucion.data[i] ?? 0) })),
            topUsuarios: obtenerTopUsuariosGeneral(data.visitas, data.tickets),
            mantPorUsuario: contarMantenimientosPorUsuario(data.visitas).slice(0, 30),
            marcas: Object.entries(marcas)
                .map(([etiqueta, valor]) => ({ etiqueta, valor }))
                .sort((a, b) => b.valor - a.valor),
            topSolicitantesTickets: obtenerTopSolicitantesTickets(data.tickets),
            extras: contarExtras(data.visitas),
            sMap,
        };
    }, [data, empresaNombre, periodoTexto]);

    const {
        exportData,
        mantPorFecha,
        tiposVisita,
        actividades,
        distribucion,
        topUsuarios,
        mantPorUsuario,
        marcas,
        topSolicitantesTickets,
        extras,
        sMap,
    } = calc;

    const remotas = data.mantencionesRemotas ?? [];

    const kpis = [
        { label: "Tickets del periodo", value: data.tickets.length },
        { label: "Visitas técnicas", value: data.visitas.length },
        { label: "Equipos registrados", value: data.equipos.length },
        { label: "Usuarios atendidos", value: data.solicitantes.length },
        { label: "Horas de soporte", value: `${exportData.totalHorasSoporte.toFixed(1)} h` },
    ];

    return (
        <div className="space-y-4">
            {/* Encabezado */}
            <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-slate-700 pb-3">
                <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500">Informe mensual de soporte</p>
                    <h4 className="text-xl font-bold text-slate-900">{empresaNombre || "—"}</h4>
                </div>
                <p className="text-sm font-medium text-slate-600">{periodoTexto || "—"}</p>
            </div>

            <p className="text-xs text-slate-500">
                Datos y secciones del Word «Descargar Word (DOCX)», en el mismo orden. Los gráficos se
                muestran como barras y las tablas largas se pueden expandir.
            </p>

            {/* Resumen ejecutivo */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {kpis.map((k) => (
                    <div key={k.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">{k.label}</p>
                        <p className="text-2xl font-bold text-slate-900 tabular-nums">
                            {typeof k.value === "number" ? k.value.toLocaleString("es-CL") : k.value}
                        </p>
                    </div>
                ))}
            </div>

            <Seccion numero={1} titulo="Contexto y alcance" resumen="Texto fijo del informe">
                <div>
                    <Subtitulo>Antecedentes</Subtitulo>
                    <Texto>{TEXTO_FIJO.antecedentes}</Texto>
                </div>
                <div>
                    <Subtitulo>Objetivos</Subtitulo>
                    <Texto>{TEXTO_FIJO.objetivos}</Texto>
                </div>
            </Seccion>

            <Seccion
                numero={2}
                titulo="Análisis operacional"
                resumen={`${mantPorFecha.reduce((s, r) => s + r.Cantidad, 0)} mantenciones · ${remotas.length} remotas`}
                abierta
            >
                <div>
                    <Subtitulo>Cantidad de mantenciones por fecha</Subtitulo>
                    <Barras filas={mantPorFecha.map((r) => ({ etiqueta: r.Fecha, valor: r.Cantidad }))} maximoFilas={31} />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <Subtitulo>Distribución de servicios</Subtitulo>
                        <Barras filas={distribucion} />
                    </div>
                    <div>
                        <Subtitulo>Solicitudes programadas vs adicionales</Subtitulo>
                        <Barras filas={tiposVisita.map((r) => ({ etiqueta: r.Tipo, valor: r.Cantidad }))} />
                    </div>
                </div>
                <div>
                    <Subtitulo>Actividades de mantenimiento</Subtitulo>
                    <Barras filas={actividades.map((r) => ({ etiqueta: r.Ítem, valor: r.Cantidad }))} />
                </div>
                <div>
                    <Subtitulo>Mantenciones remotas — {remotas.length}</Subtitulo>
                    <Tabla
                        columnas={["ID", "Técnico", "Inicio", "Fin", "Estado", "Usuario"]}
                        filas={remotas.map((m) => ({
                            ID: m.id_mantencion,
                            Técnico: m.tecnico?.nombre ?? "—",
                            Inicio: fechaHora(m.inicio),
                            Fin: fechaHora(m.fin),
                            Estado: (m.status ?? "").toUpperCase(),
                            Usuario: m.solicitante ?? "—",
                        }))}
                    />
                </div>
            </Seccion>

            <Seccion numero={3} titulo="Resumen mensual de mantenciones remotas">
                <Texto>{exportData.teamViewerMonthlySummaryText}</Texto>
                <Tabla
                    columnas={["Mes", "Sesiones", "Minutos", "Horas"]}
                    filas={exportData.tvBreakdownRows}
                    alinearDerecha={["Sesiones", "Minutos", "Horas"]}
                />
            </Seccion>

            <Seccion numero={4} titulo="Usuarios y equipamiento" resumen={`${marcas.length} marcas`}>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <Subtitulo>Top 5 usuarios con más solicitudes</Subtitulo>
                        <Barras filas={topUsuarios.map((r) => ({ etiqueta: String(r.Usuario), valor: Number(r.Solicitudes) }))} />
                    </div>
                    <div>
                        <Subtitulo>Inventario de equipos por marca</Subtitulo>
                        <Barras filas={marcas} />
                    </div>
                </div>
                <div>
                    <Subtitulo>Cantidad de mantenciones por usuario</Subtitulo>
                    <Barras filas={mantPorUsuario.map((r) => ({ etiqueta: r.Usuario, valor: r.Cantidad }))} maximoFilas={30} />
                </div>
            </Seccion>

            <Seccion numero={5} titulo="Detalle de gestión · Tickets" resumen={`${data.tickets.length} tickets`}>
                <Tabla
                    columnas={["ID", "Asunto", "Estado", "Fecha creación", "Fecha resolución", "Técnico asignado", "Correo solicitante"]}
                    filas={data.tickets.map((t) => ({
                        ID: t.ticket_id,
                        Asunto: t.subject ?? "",
                        Estado: estadoTicket(t.status),
                        "Fecha creación": fechaHora(t.createdAt ?? t.fecha),
                        "Fecha resolución": fechaHora(t.resolvedAt),
                        "Técnico asignado": t.assigneeNombre ?? "—",
                        "Correo solicitante": t.solicitante_email ?? "—",
                    }))}
                />
                <div>
                    <Subtitulo>Top 5 solicitantes con más tickets</Subtitulo>
                    <Barras filas={topSolicitantesTickets.map((r) => ({ etiqueta: String(r.Solicitante), valor: Number(r.Tickets) }))} />
                </div>
                <div>
                    <Subtitulo>Resumen mensual de tickets</Subtitulo>
                    <Texto>{exportData.dashboardMonthlySummary}</Texto>
                    <div className="mt-2">
                        <Tabla
                            columnas={["Mes", "Tickets", "Cerrados", "Horas est.", "% ≤ 8h", "Mediana", "Complejos"]}
                            filas={exportData.dashboardMonthlyRows}
                            alinearDerecha={["Tickets", "Cerrados", "Horas est.", "% ≤ 8h", "Mediana", "Complejos"]}
                        />
                    </div>
                </div>
            </Seccion>

            <Seccion
                numero={6}
                titulo="Visitas técnicas"
                resumen={`${exportData.totalJornadasVisitas} jornadas · ${exportData.formatHorasMinutos(exportData.totalMinutosVisitas)}`}
            >
                <Texto>{exportData.resumenVisitasTecnicas}</Texto>
                <Tabla
                    columnas={["Técnico", "Fecha", "Horario", "Usuario", "Estado"]}
                    filas={data.visitas.map((v) => {
                        const i = v.inicio ? new Date(v.inicio) : null;
                        const f = v.fin ? new Date(v.fin) : null;
                        const hora = (d: Date) => d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
                        return {
                            Técnico: v.tecnico?.nombre ?? "—",
                            Fecha: i && !isNaN(i.getTime()) ? i.toLocaleDateString("es-CL") : "—",
                            Horario: i && f && !isNaN(i.getTime()) && !isNaN(f.getTime()) ? `${hora(i)} - ${hora(f)}` : "—",
                            Usuario: v.solicitante ?? v.solicitanteRef?.nombre ?? "—",
                            Estado: (v.status ?? "").toUpperCase() || "—",
                        };
                    })}
                />
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <Subtitulo>Configuraciones y otros (totales)</Subtitulo>
                        <Barras filas={extras.totales.map((r) => ({ etiqueta: r.Ítem, valor: r.Cantidad }))} />
                    </div>
                    <div>
                        <Subtitulo>Detalle de «Otros»</Subtitulo>
                        <Tabla
                            columnas={["Detalle", "Cantidad"]}
                            filas={extras.detalles.map((d) => ({ Detalle: d.Detalle, Cantidad: d.Cantidad }))}
                            alinearDerecha={["Cantidad"]}
                        />
                    </div>
                </div>
            </Seccion>

            <Seccion numero={7} titulo="Total mensual de horas de soporte" resumen={`${exportData.totalHorasSoporte.toFixed(1)} h`} abierta>
                <Texto>{exportData.totalSoporteResumen}</Texto>
                <Tabla
                    columnas={["Concepto", "Tiempo"]}
                    filas={[
                        { Concepto: "Tickets (estimado)", Tiempo: `${exportData.totalHorasTickets.toFixed(1)} h` },
                        { Concepto: "Mantenciones remotas", Tiempo: exportData.formatHorasMinutos(exportData.totalMinutosRemotas) },
                        { Concepto: "Visitas técnicas", Tiempo: exportData.formatHorasMinutos(exportData.totalMinutosVisitas) },
                        { Concepto: "Total", Tiempo: `${exportData.totalHorasSoporte.toFixed(1)} h` },
                    ]}
                    alinearDerecha={["Tiempo"]}
                />
            </Seccion>

            <Seccion
                numero={8}
                titulo="Usuarios e inventario"
                resumen={`${data.solicitantes.length} usuarios · ${data.equipos.length} equipos`}
            >
                <div>
                    <Subtitulo>Usuarios y correos activos</Subtitulo>
                    <Tabla
                        columnas={["#", "Nombre", "Correo"]}
                        filas={data.solicitantes.map((s, i) => ({ "#": i + 1, Nombre: s.nombre ?? "", Correo: s.email ?? "" }))}
                    />
                </div>
                <div>
                    <Subtitulo>Inventario de equipamiento</Subtitulo>
                    <Tabla
                        columnas={["Serial", "Marca", "Modelo", "RAM", "Disco", "Propiedad", "Solicitante"]}
                        filas={data.equipos.map((e) => ({
                            Serial: e.serial ?? "",
                            Marca: e.marca ?? "",
                            Modelo: e.modelo ?? "",
                            RAM: e.ram ?? "",
                            Disco: e.disco ?? "",
                            Propiedad: e.propiedad ?? "",
                            Solicitante: e.idSolicitante != null ? sMap.get(e.idSolicitante) ?? "" : "",
                        }))}
                    />
                </div>
            </Seccion>

            <Seccion
                numero={9}
                titulo="Análisis y recomendaciones del periodo"
                resumen={recomendaciones?.trim() ? "Generado" : "Pendiente"}
            >
                {recomendaciones?.trim() ? (
                    <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                        {recomendaciones}
                    </div>
                ) : (
                    <SinDatos texto="Aún no hay recomendaciones. Genéralas en «Portada y recomendaciones» antes de descargar el Word." />
                )}
            </Seccion>
        </div>
    );
};

export default VistaPreviaInforme;