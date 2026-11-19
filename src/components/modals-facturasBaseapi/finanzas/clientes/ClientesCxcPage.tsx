// src/components/modals-facturasBaseapi/finanzas/clientes/ClientesCxcPage.tsx
// Fase 3a: «Clientes» (reemplaza Receptores de facturación y Receptores de cobranza).
// Una fila por RUT: receptores de facturación/cobranza + facturas de RIDS y ECONNET del núcleo de cuentas por cobrar.
// Fuente: GET /baseapi/finanzas/cxc/clientes

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { ConfigProvider, Dropdown, Pagination, Tooltip } from "antd";
import esES from "antd/locale/es_ES";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    BellRing,
    DatabaseZap,
    Info,
    Mail,
    Minus,
    RefreshCw,
    Search,
    ThumbsDown,
    ThumbsUp,
    TriangleAlert,
    UserPlus,
    Users,
    X,
} from "lucide-react";

import { api } from "../../../../api/api";

import SincronizarReceptoresCrmModal, { type ModuloReceptores } from "../../SincronizarReceptoresCrmModal";
import type { ClienteCxcFila, ClientesCxcResponse, EmpresaCxc, FichaClienteCxcResponse } from "../cxc.types";
import ClienteFichaModal, { formatRut } from "./ClienteFichaModal";

/* =========================================================
   HELPERS
========================================================= */

function formatCLP(value: number) {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
}

function mensajeError(err: any, porDefecto: string) {
    return String(err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? porDefecto);
}

/** Valida el dígito verificador (módulo 11). */
function rutValido(rut: string) {
    const limpio = rut.replace(/[^0-9kK]/g, "").toUpperCase();
    if (limpio.length < 2) return false;
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    let suma = 0;
    let factor = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += Number(cuerpo[i]) * factor;
        factor = factor === 7 ? 2 : factor + 1;
    }
    const resto = 11 - (suma % 11);
    const esperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
    return dv === esperado;
}

type Filtro = "TODOS" | "CON_SALDO" | "VENCIDOS" | "SIN_CONTACTOS" | "SIN_MARCAR" | "SIN_AUTOMATICOS";

const FILTROS: Array<{ id: Filtro; label: string; ayuda: string }> = [
    { id: "TODOS", label: "Todos", ayuda: "Todos los RUT con receptor o con facturas emitidas." },
    { id: "CON_SALDO", label: "Con saldo", ayuda: "Tienen facturas por cobrar en RIDS o ECONNET." },
    { id: "VENCIDOS", label: "Con vencidos", ayuda: "Tienen al menos una factura vencida." },
    { id: "SIN_CONTACTOS", label: "Sin contactos", ayuda: "No tienen ningún contacto registrado." },
    {
        id: "SIN_MARCAR",
        label: "Sin marcar",
        ayuda: "Tienen contactos, pero ninguno marcado para Facturas ni Cobranza (por ejemplo, los importados de Duemint). No reciben correos automáticos.",
    },
    { id: "SIN_AUTOMATICOS", label: "Sin envíos automáticos", ayuda: "Con saldo, pero sin recordatorios automáticos de cobranza." },
];

/** Con qué empresa emisora tiene facturas el cliente (categorías excluyentes). */
type Cartera = "TODAS" | "RIDS" | "ECONNET" | "AMBAS" | "SIN_FACTURAS";

const CARTERAS: Array<{ id: Cartera; label: string; ayuda: string }> = [
    { id: "TODAS", label: "Todas", ayuda: "Clientes de RIDS, de ECONNET y de ambas." },
    { id: "RIDS", label: "Solo RIDS", ayuda: "Tienen facturas emitidas solo por RIDS." },
    { id: "ECONNET", label: "Solo ECONNET", ayuda: "Tienen facturas emitidas solo por ECONNET." },
    { id: "AMBAS", label: "Ambas", ayuda: "Tienen facturas emitidas por RIDS y por ECONNET." },
    { id: "SIN_FACTURAS", label: "Sin facturas", ayuda: "Receptores configurados que no tienen facturas en los períodos leídos." },
];

function carteraDe(c: ClienteCxcFila): Exclude<Cartera, "TODAS"> {
    const rids = Boolean(c.porEmpresa.rids);
    const econnet = Boolean(c.porEmpresa.econnet);
    if (rids && econnet) return "AMBAS";
    if (rids) return "RIDS";
    if (econnet) return "ECONNET";
    return "SIN_FACTURAS";
}

const CARTERA_BADGE: Record<Exclude<Cartera, "TODAS">, { label: string; clase: string }> = {
    RIDS: { label: "RIDS", clase: "bg-teal-50 text-teal-700" },
    ECONNET: { label: "ECONNET", clase: "bg-blue-50 text-blue-700" },
    AMBAS: { label: "RIDS + ECONNET", clase: "bg-violet-50 text-violet-700" },
    SIN_FACTURAS: { label: "Sin facturas", clase: "bg-slate-100 text-slate-500" },
};

/* ---------- Orden de columnas ---------- */

type ColumnaOrden = "cliente" | "pago" | "rids" | "econnet" | "atraso" | "credito" | "facturas" | "cobranza";
type Orden = { columna: ColumnaOrden; dir: "asc" | "desc" } | null;

/** Valor por el que se ordena cada columna (sin facturas en una empresa = queda al final). */
function valorOrden(c: ClienteCxcFila, columna: ColumnaOrden): number | string {
    switch (columna) {
        case "cliente":
            return (c.razonSocial ?? "").toLowerCase();
        case "rids":
            return c.porEmpresa.rids?.porCobrar ?? -1;
        case "econnet":
            return c.porEmpresa.econnet?.porCobrar ?? -1;
        case "atraso":
            return c.maxDiasVencido;
        case "pago":
            return c.puntualidad?.score ?? (c.puntualidad ? -1 : -2);
        case "credito":
            return c.diasCredito ?? 30;
        case "facturas":
            return c.facturacion.contactos + (c.facturacion.recibe ? 0.5 : 0);
        case "cobranza":
            return c.cobranza.contactos + (c.cobranza.recibe ? 0.5 : 0);
    }
}

/* =========================================================
   COMPONENTE
========================================================= */

const ClientesCxcPage: React.FC = () => {
    const [clientes, setClientes] = useState<ClienteCxcFila[]>([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");

    const [busqueda, setBusqueda] = useState("");
    const [filtro, setFiltro] = useState<Filtro>("TODOS");
    const [cartera, setCartera] = useState<Cartera>("TODAS");
    const [orden, setOrden] = useState<Orden>(null);
    const [pagina, setPagina] = useState(1);
    const [tamanoPagina, setTamanoPagina] = useState(50);

    const [rutFicha, setRutFicha] = useState<string | null>(null);
    const [tabFicha, setTabFicha] = useState<"cuenta" | "comportamiento">("cuenta");
    const [huboCambios, setHuboCambios] = useState(false);
    const [sincronizar, setSincronizar] = useState<ModuloReceptores | null>(null);
    const [nuevo, setNuevo] = useState(false);

    const cargar = useCallback(async (refrescar = false) => {
        setCargando(true);
        setError("");
        try {
            const response = await api.get<ClientesCxcResponse>("/baseapi/finanzas/cxc/clientes", { params: refrescar ? { refrescar: 1 } : {} });
            setClientes(response.data.data.clientes);
        } catch (err: any) {
            setError(mensajeError(err, "No se pudieron cargar los clientes."));
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        void cargar();
    }, [cargar]);

    useEffect(() => setPagina(1), [busqueda, filtro, cartera, orden]);

    /* ---------- Filtros ---------- */

    const coincide = useCallback(
        (c: ClienteCxcFila) => {
            const texto = busqueda.trim().toLowerCase();
            if (!texto) return true;
            const digitos = texto.replace(/[^0-9k]/g, "");
            return (
                (c.razonSocial ?? "").toLowerCase().includes(texto) ||
                (c.empresa?.nombre ?? "").toLowerCase().includes(texto) ||
                (digitos !== "" && c.rut.toLowerCase().includes(digitos))
            );
        },
        [busqueda],
    );

    const cumpleFiltro = (c: ClienteCxcFila, f: Filtro) => {
        switch (f) {
            case "CON_SALDO":
                return c.porCobrar > 0;
            case "VENCIDOS":
                return c.vencido > 0;
            case "SIN_CONTACTOS":
                return (c.totalContactos ?? 0) === 0;
            case "SIN_MARCAR":
                return (c.totalContactos ?? 0) > 0 && c.facturacion.contactos === 0 && c.cobranza.contactos === 0;
            case "SIN_AUTOMATICOS":
                return c.porCobrar > 0 && !c.cobranza.recibe;
            default:
                return true;
        }
    };

    const buscados = useMemo(() => clientes.filter(coincide), [clientes, coincide]);

    const conteoCartera = useMemo(() => {
        const r: Record<Cartera, number> = { TODAS: buscados.length, RIDS: 0, ECONNET: 0, AMBAS: 0, SIN_FACTURAS: 0 };
        for (const c of buscados) r[carteraDe(c)]++;
        return r;
    }, [buscados]);

    const base = useMemo(() => (cartera === "TODAS" ? buscados : buscados.filter((c) => carteraDe(c) === cartera)), [buscados, cartera]);

    const filas = useMemo(() => {
        const lista = base.filter((c) => cumpleFiltro(c, filtro));
        if (!orden) return lista;

        const signo = orden.dir === "asc" ? 1 : -1;
        return [...lista].sort((a, b) => {
            const va = valorOrden(a, orden.columna);
            const vb = valorOrden(b, orden.columna);
            const cmp = typeof va === "string" && typeof vb === "string" ? va.localeCompare(vb) : Number(va) - Number(vb);
            return cmp * signo || String(a.razonSocial).localeCompare(String(b.razonSocial));
        });
    }, [base, filtro, orden]);

    /** Clic en un encabezado: primero el orden natural (texto A→Z, montos de mayor a menor), luego se invierte, luego se quita. */
    const ordenarPor = (columna: ColumnaOrden) =>
        setOrden((actual) => {
            const inicial = columna === "cliente" ? "asc" : "desc";
            if (!actual || actual.columna !== columna) return { columna, dir: inicial };
            if (actual.dir === inicial) return { columna, dir: inicial === "asc" ? "desc" : "asc" };
            return null;
        });

    const conteo = useMemo(() => {
        const r = {} as Record<Filtro, number>;
        for (const f of FILTROS) r[f.id] = base.filter((c) => cumpleFiltro(c, f.id)).length;
        return r;
    }, [base]);

    const totales = useMemo(
        () => ({
            porCobrar: filas.reduce((s, c) => s + c.porCobrar, 0),
            vencido: filas.reduce((s, c) => s + c.vencido, 0),
        }),
        [filas],
    );

    const desde = (pagina - 1) * tamanoPagina;

    /* ---------- Render ---------- */

    return (
        <ConfigProvider locale={esES}>
            <div className="min-h-screen bg-slate-50 px-3 py-4 sm:px-5 lg:px-6">
                <div className="mx-auto w-full max-w-[1800px] space-y-4">
                    {/* Header */}
                    <div className="rounded-3xl border border-cyan-200 bg-cyan-50/30 px-4 py-5 shadow-sm sm:px-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-200">
                                    Administración Finanzas
                                </span>
                                <h1 className="mt-3 flex items-center gap-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                                    <Users size={22} className="text-cyan-600" /> Clientes
                                </h1>
                                <p className="mt-1 max-w-2xl text-sm text-slate-600">
                                    Estado de cuenta en RIDS y ECONNET, contactos para facturas y cobranza, y días de crédito.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Dropdown
                                    trigger={["click"]}
                                    menu={{
                                        items: [
                                            { key: "FACTURACION", label: "Contactos de facturación" },
                                            { key: "COBRANZA", label: "Contactos de cobranza" },
                                        ],
                                        onClick: ({ key }) => setSincronizar(key as ModuloReceptores),
                                    }}
                                >
                                    <button
                                        type="button"
                                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-cyan-300 bg-white px-4 text-sm font-bold text-cyan-700 hover:bg-cyan-50"
                                    >
                                        <DatabaseZap size={16} /> Sincronizar desde CRM
                                    </button>
                                </Dropdown>
                                <button
                                    type="button"
                                    onClick={() => setNuevo(true)}
                                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-cyan-300 bg-white px-4 text-sm font-bold text-cyan-700 hover:bg-cyan-50"
                                >
                                    <UserPlus size={16} /> Nuevo cliente
                                </button>
                                <Tooltip title="Recalcula las facturas de RIDS y ECONNET sin esperar los 5 minutos de caché.">
                                    <button
                                        type="button"
                                        onClick={() => void cargar(true)}
                                        disabled={cargando}
                                        className="inline-flex h-10 items-center gap-2 rounded-2xl bg-cyan-600 px-4 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
                                    >
                                        <RefreshCw size={16} className={cargando ? "animate-spin" : ""} /> {cargando ? "Cargando..." : "Recalcular"}
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    </div>

                    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

                    {/* Filtros */}
                    <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="relative w-full lg:w-80">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Razón social, empresa o RUT"
                                className="h-9 w-full rounded-xl border border-slate-200 pl-8 pr-3 text-xs outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                            />
                        </div>
                        <div className="flex flex-wrap rounded-xl bg-slate-100 p-1">
                            {CARTERAS.map((c) => (
                                <Tooltip key={c.id} title={c.ayuda}>
                                    <button
                                        type="button"
                                        onClick={() => setCartera(c.id)}
                                        className={`rounded-lg px-3 py-1 text-xs font-bold transition ${cartera === c.id ? "bg-white text-cyan-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                            }`}
                                    >
                                        {c.label} ({conteoCartera[c.id]})
                                    </button>
                                </Tooltip>
                            ))}
                        </div>
                        <div className="flex basis-full flex-wrap gap-1 lg:order-3">
                            {FILTROS.map((f) => (
                                <Tooltip key={f.id} title={f.ayuda}>
                                    <button
                                        type="button"
                                        onClick={() => setFiltro(f.id)}
                                        className={`rounded-full px-3 py-1 text-xs font-bold transition ${filtro === f.id ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"
                                            }`}
                                    >
                                        {f.label} ({conteo[f.id]})
                                    </button>
                                </Tooltip>
                            ))}
                        </div>
                        <div className="ml-auto text-xs text-slate-500 lg:order-2">
                            Por cobrar <strong className="text-slate-900">{formatCLP(totales.porCobrar)}</strong> · vencido{" "}
                            <strong className="text-red-600">{formatCLP(totales.vencido)}</strong>
                        </div>
                    </div>

                    {/* Tabla */}
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1000px] text-xs">
                                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <ColumnaOrdenable columna="cliente" orden={orden} onClick={ordenarPor} alineacion="left">
                                            Cliente
                                        </ColumnaOrdenable>
                                        <ColumnaOrdenable columna="rids" orden={orden} onClick={ordenarPor} alineacion="right" ayuda="Por cobrar en RIDS.">
                                            RIDS
                                        </ColumnaOrdenable>
                                        <ColumnaOrdenable columna="econnet" orden={orden} onClick={ordenarPor} alineacion="right" ayuda="Por cobrar en ECONNET.">
                                            ECONNET
                                        </ColumnaOrdenable>
                                        <ColumnaOrdenable
                                            columna="pago"
                                            orden={orden}
                                            onClick={ordenarPor}
                                            alineacion="center"
                                            ayuda="Comportamiento de pago de los últimos 12 meses. Clic en el ícono para ver el detalle."
                                        >
                                            Pago
                                        </ColumnaOrdenable>
                                        <ColumnaOrdenable
                                            columna="atraso"
                                            orden={orden}
                                            onClick={ordenarPor}
                                            alineacion="right"
                                            ayuda="Días de atraso de la factura más antigua sin pagar."
                                        >
                                            Mayor atraso
                                        </ColumnaOrdenable>
                                        <ColumnaOrdenable
                                            columna="credito"
                                            orden={orden}
                                            onClick={ordenarPor}
                                            alineacion="center"
                                            ayuda="Días de crédito: solo RIDS. ECONNET siempre vence el día 1 del mes siguiente."
                                        >
                                            Crédito RIDS
                                        </ColumnaOrdenable>
                                        <ColumnaOrdenable
                                            columna="facturas"
                                            orden={orden}
                                            onClick={ordenarPor}
                                            alineacion="center"
                                            ayuda="Envío automático de facturas · contactos que las reciben."
                                        >
                                            Facturas
                                        </ColumnaOrdenable>
                                        <ColumnaOrdenable
                                            columna="cobranza"
                                            orden={orden}
                                            onClick={ordenarPor}
                                            alineacion="center"
                                            ayuda="Recordatorios automáticos · contactos que los reciben."
                                        >
                                            Cobranza
                                        </ColumnaOrdenable>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filas.slice(desde, desde + tamanoPagina).map((c) => (
                                        <tr
                                            key={c.rut}
                                            onClick={() => {
                                                setTabFicha("cuenta");
                                                setRutFicha(c.rut);
                                            }}
                                            className="cursor-pointer hover:bg-cyan-50/40"
                                        >
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800">{c.razonSocial ?? "—"}</span>
                                                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${CARTERA_BADGE[carteraDe(c)].clase}`}>
                                                        {CARTERA_BADGE[carteraDe(c)].label}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-slate-400">
                                                    {formatRut(c.rut)}
                                                    {c.empresa ? ` · ${c.empresa.nombre}` : ""}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <SaldoEmpresa empresa="rids" fila={c} />
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <SaldoEmpresa empresa="econnet" fila={c} />
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <IconoPago
                                                    puntualidad={c.puntualidad}
                                                    onClick={() => {
                                                        setTabFicha("comportamiento");
                                                        setRutFicha(c.rut);
                                                    }}
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                {c.maxDiasVencido > 0 ? (
                                                    <span className="rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-700">{c.maxDiasVencido} días</span>
                                                ) : (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-center text-slate-700">{c.diasCredito ?? <span className="text-slate-400">30*</span>}</td>
                                            <td className="px-4 py-2 text-center">
                                                <EstadoModulo activo={c.facturacion.recibe} contactos={c.facturacion.contactos} icon={<Mail size={13} />} />
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <EstadoModulo activo={c.cobranza.recibe} contactos={c.cobranza.contactos} icon={<BellRing size={13} />} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {!cargando && filas.length === 0 && <div className="px-4 py-10 text-center text-sm text-slate-400">No hay clientes para estos filtros.</div>}
                            {cargando && clientes.length === 0 && <div className="px-4 py-10 text-center text-sm text-slate-400">Cargando clientes...</div>}
                        </div>

                        {filas.length > 0 && (
                            <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                                <span>
                                    {desde + 1}–{Math.min(desde + tamanoPagina, filas.length)} de {filas.length} · * 30 días por defecto
                                </span>
                                <Pagination
                                    size="small"
                                    current={pagina}
                                    pageSize={tamanoPagina}
                                    total={filas.length}
                                    showSizeChanger
                                    pageSizeOptions={[10, 20, 50, 100]}
                                    onChange={(p, ps) => {
                                        if (ps !== tamanoPagina) {
                                            setTamanoPagina(ps);
                                            setPagina(1);
                                        } else {
                                            setPagina(p);
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {rutFicha && (
                    <ClienteFichaModal
                        rut={rutFicha}
                        tabInicial={tabFicha}
                        onCambio={() => setHuboCambios(true)}
                        onClose={() => {
                            setRutFicha(null);
                            if (huboCambios) {
                                setHuboCambios(false);
                                void cargar();
                            }
                        }}
                    />
                )}

                {sincronizar && (
                    <SincronizarReceptoresCrmModal
                        open
                        modulo={sincronizar}
                        onClose={() => setSincronizar(null)}
                        onAplicado={() => cargar()}
                    />
                )}

                {nuevo && (
                    <NuevoClienteModal
                        onClose={() => setNuevo(false)}
                        onCreado={(rut) => {
                            setNuevo(false);
                            setRutFicha(rut);
                            void cargar();
                        }}
                    />
                )}
            </div>
        </ConfigProvider>
    );
};

/* =========================================================
   AUXILIARES
========================================================= */

const ColumnaOrdenable: React.FC<{
    columna: ColumnaOrden;
    orden: Orden;
    onClick: (columna: ColumnaOrden) => void;
    alineacion: "left" | "right" | "center";
    ayuda?: string;
    children: React.ReactNode;
}> = ({ columna, orden, onClick, alineacion, ayuda, children }) => {
    const activa = orden?.columna === columna;
    const Icono = !activa ? ArrowUpDown : orden.dir === "asc" ? ArrowUp : ArrowDown;
    const justify = alineacion === "left" ? "justify-start" : alineacion === "right" ? "justify-end" : "justify-center";

    const boton = (
        <button
            type="button"
            onClick={() => onClick(columna)}
            className={`inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-cyan-700 ${activa ? "text-cyan-700" : ""}`}
        >
            {children}
            {ayuda && <Info size={11} className="text-slate-400" />}
            <Icono size={11} className={activa ? "" : "text-slate-300"} />
        </button>
    );

    return (
        <th
            className={`px-4 py-2 ${alineacion === "left" ? "text-left" : alineacion === "right" ? "text-right" : "text-center"}`}
            aria-sort={activa ? (orden.dir === "asc" ? "ascending" : "descending") : "none"}
        >
            <div className={`flex ${justify}`}>{ayuda ? <Tooltip title={ayuda}>{boton}</Tooltip> : boton}</div>
        </th>
    );
};

const ICONO_PAGO: Record<NonNullable<ClienteCxcFila["puntualidad"]>["estado"], { label: string; icon: React.ReactNode; clase: string }> = {
    EXCELENTE: { label: "Excelente pagador", icon: <ThumbsUp size={15} />, clase: "bg-emerald-50 text-emerald-600 ring-emerald-200" },
    BUEN_PAGADOR: { label: "Buen pagador", icon: <ThumbsUp size={15} />, clase: "bg-cyan-50 text-cyan-600 ring-cyan-200" },
    IRREGULAR: { label: "Pagador irregular", icon: <TriangleAlert size={15} />, clase: "bg-amber-50 text-amber-600 ring-amber-200" },
    RIESGO_MORA: { label: "Mal pagador", icon: <ThumbsDown size={15} />, clase: "bg-red-50 text-red-600 ring-red-200" },
    SIN_HISTORIAL: { label: "Sin historial suficiente", icon: <Minus size={15} />, clase: "bg-slate-50 text-slate-400 ring-slate-200" },
};

/** Ícono de buen/mal pagador; el clic abre la ficha en «Comportamiento de pago». */
const IconoPago: React.FC<{ puntualidad: ClienteCxcFila["puntualidad"]; onClick: () => void }> = ({ puntualidad, onClick }) => {
    if (!puntualidad) {
        return (
            <Tooltip title="Sin facturas pagadas en los últimos 12 meses.">
                <span className="text-slate-300">—</span>
            </Tooltip>
        );
    }

    const info = ICONO_PAGO[puntualidad.estado];
    const detalle =
        puntualidad.estado === "SIN_HISTORIAL"
            ? `${puntualidad.totalEvaluados} factura(s) pagada(s): se necesitan 5 para calificar.`
            : `Puntaje ${puntualidad.score ?? "—"} · ${puntualidad.porcentajeATiempo}% a tiempo de ${puntualidad.totalEvaluados}` +
            (puntualidad.promedioDiasAtraso > 0 ? ` · atraso promedio ${puntualidad.promedioDiasAtraso} días` : "");

    return (
        <Tooltip
            title={
                <div>
                    <div className="font-bold">{info.label}</div>
                    <div>{detalle}</div>
                    <div className="mt-1 opacity-70">Clic para ver el detalle</div>
                </div>
            }
        >
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                }}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full ring-1 transition hover:scale-110 ${info.clase}`}
                aria-label={info.label}
            >
                {info.icon}
            </button>
        </Tooltip>
    );
};

const SaldoEmpresa: React.FC<{ empresa: EmpresaCxc; fila: ClienteCxcFila }> = ({ empresa, fila }) => {
    const r = fila.porEmpresa[empresa];
    if (!r) return <span className="text-slate-300">—</span>;
    if (r.porCobrar === 0) return <span className="text-[11px] text-emerald-600">Al día</span>;
    return (
        <div>
            <div className="font-bold text-slate-900">{formatCLP(r.porCobrar)}</div>
            {r.vencido > 0 && <div className="text-[10px] font-semibold text-red-600">vencido {formatCLP(r.vencido)}</div>}
        </div>
    );
};

const EstadoModulo: React.FC<{ activo: boolean; contactos: number; icon: React.ReactNode }> = ({ activo, contactos, icon }) => (
    <Tooltip title={`${activo ? "Automático activado" : "Automático desactivado"} · ${contactos} contacto(s)`}>
        <span
            className={`inline-flex cursor-help items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${activo ? "bg-emerald-50 text-emerald-700" : contactos > 0 ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"
                }`}
        >
            {icon} {contactos}
        </span>
    </Tooltip>
);

/** Crea el cliente con su primer contacto. Si el RUT ya existe, solo agrega (o actualiza) el contacto y abre la ficha. */
const NuevoClienteModal: React.FC<{ onClose: () => void; onCreado: (rut: string) => void }> = ({ onClose, onCreado }) => {
    const [rut, setRut] = useState("");
    const [razonSocial, setRazonSocial] = useState("");
    const [email, setEmail] = useState("");
    const [nombre, setNombre] = useState("");
    const [facturas, setFacturas] = useState(true);
    const [cobranza, setCobranza] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    const rutLimpio = rut.replace(/[^0-9kK]/g, "").toUpperCase();
    const inputClase =
        "h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";

    const crear = async () => {
        setError("");
        if (!rutValido(rutLimpio)) {
            setError("RUT inválido (revisa el dígito verificador).");
            return;
        }
        setGuardando(true);
        try {
            // El primer contacto crea los receptores que hagan falta (con los envíos automáticos apagados).
            await api.put<FichaClienteCxcResponse>(`/baseapi/finanzas/cxc/clientes/${rutLimpio}/contactos`, {
                email: email.trim(),
                nombre: nombre.trim() || null,
                facturas,
                cobranza,
            });
            if (razonSocial.trim()) {
                await api.patch(`/baseapi/finanzas/cxc/clientes/${rutLimpio}/config`, { razonSocial: razonSocial.trim() });
            }
            onCreado(rutLimpio);
        } catch (err: any) {
            setError(mensajeError(err, "No se pudo crear el cliente."));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900">Nuevo cliente</h3>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
                        <X size={16} />
                    </button>
                </div>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">RUT</span>
                            <input value={rut} onChange={(e) => setRut(e.target.value)} placeholder="76.123.456-7" className={inputClase} />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Razón social</span>
                            <input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} className={inputClase} />
                        </label>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Primer contacto</div>
                        <div className="grid grid-cols-2 gap-2">
                            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@cliente.cl" className={inputClase} />
                            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre (opcional)" className={inputClase} />
                        </div>
                        <div className="mt-2 flex gap-4 text-xs font-semibold text-slate-700">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={facturas} onChange={(e) => setFacturas(e.target.checked)} /> Facturas
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={cobranza} onChange={(e) => setCobranza(e.target.checked)} /> Cobranza
                            </label>
                        </div>
                    </div>
                    <div className="text-[11px] text-slate-500">Los envíos automáticos quedan apagados; se activan desde la ficha.</div>
                    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-xs font-semibold text-red-700">{error}</div>}
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => void crear()}
                            disabled={guardando || !rutLimpio || !email.trim() || (!facturas && !cobranza)}
                            className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
                        >
                            {guardando ? "Creando..." : "Crear y abrir ficha"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientesCxcPage;