// src/components/modals-facturasBaseapi/SincronizarReceptoresCrmModal.tsx
//
// «Sincronizar desde el CRM» para Receptores de Facturación y de Cobranza.
// 1. Al abrir: simula (POST …/sincronizar-crm) y muestra qué haría.
// 2. «Aplicar cambios» → confirmación → aplica (…?aplicar=1) y recarga la tabla con onAplicado.
// Los receptores nuevos quedan apagados: nadie empieza a recibir correos por esta acción.
import {
    useCallback,
    useEffect,
    useState,
} from "react";

import axios from "axios";

import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    DatabaseZap,
    Loader2,
    X,
} from "lucide-react";

import {
    api,
} from "../../api/api";

/* =========================================================
   TYPES (iguales al backend)
========================================================= */

export type ModuloReceptores =
    | "FACTURACION"
    | "COBRANZA";

type AccionReceptorSync =
    | "CREAR"
    | "VINCULAR"
    | "SOLO_CONTACTOS";

type ResultadoSyncReceptores = {
    modulo: ModuloReceptores;
    aplicado: boolean;
    empresasEvaluadas: number;
    empresasSinRut: number;
    empresasSinRutDetalle?: Array<{ empresaId: number; empresa: string }>;
    sinCambios: number;
    receptoresCreados: number;
    receptoresVinculados: number;
    contactosCreados: number;
    contactosSinEmailValido: number;
    rutDuplicados: Array<{ rut: string; empresas: string[] }>;
    errores: Array<{ empresa: string; rut: string; error: string }>;
    detalle: Array<{
        empresaId: number;
        empresa: string;
        rut: string;
        accion: AccionReceptorSync;
        contactosNuevos: string[];
    }>;
};

/* =========================================================
   API
========================================================= */

async function sincronizarReceptoresCrm(
    modulo: ModuloReceptores,
    aplicar: boolean
): Promise<ResultadoSyncReceptores> {
    const ruta =
        modulo === "FACTURACION"
            ? "/baseapi/facturas/receptores/sincronizar-crm"
            : "/baseapi/cobranza/receptores/sincronizar-crm";

    const { data } =
        await api.post<{ ok: boolean; data: ResultadoSyncReceptores }>(
            ruta,
            null,
            aplicar ? { params: { aplicar: "1" } } : undefined
        );

    return data.data;
}

function mensajeError(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const body = error.response?.data as { error?: string; message?: string } | undefined;
        return body?.error || body?.message || error.message || "No fue posible sincronizar";
    }
    return error instanceof Error ? error.message : "Error desconocido";
}

/* =========================================================
   HELPERS
========================================================= */

function formatRut(rut: string) {
    const clean = String(rut ?? "").replace(/[^0-9kK]/g, "").toUpperCase();
    if (clean.length < 2) return clean;
    return `${clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${clean.slice(-1)}`;
}

const ACCION: Record<AccionReceptorSync, { texto: string; clase: string }> = {
    CREAR: { texto: "Crear receptor", clase: "border-cyan-200 bg-cyan-50 text-cyan-700" },
    VINCULAR: { texto: "Vincular a empresa", clase: "border-violet-200 bg-violet-50 text-violet-700" },
    SOLO_CONTACTOS: { texto: "Agregar contactos", clase: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

/* =========================================================
   COMPONENTE
========================================================= */

type Props = {
    open: boolean;
    modulo: ModuloReceptores;
    onClose: () => void;
    /** Se llama después de aplicar con éxito (recargar la tabla). */
    onAplicado: () => void | Promise<void>;
};

export default function SincronizarReceptoresCrmModal({
    open,
    modulo,
    onClose,
    onAplicado,
}: Props) {
    const [cargando, setCargando] = useState(false);
    const [aplicando, setAplicando] = useState(false);
    const [confirmando, setConfirmando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resultado, setResultado] = useState<ResultadoSyncReceptores | null>(null);

    const etiquetaModulo = modulo === "FACTURACION" ? "facturas" : "cobranza";

    const simular = useCallback(async () => {
        try {
            setCargando(true);
            setError(null);
            setConfirmando(false);
            setResultado(await sincronizarReceptoresCrm(modulo, false));
        } catch (err) {
            setError(mensajeError(err));
        } finally {
            setCargando(false);
        }
    }, [modulo]);

    useEffect(() => {
        if (open) {
            setResultado(null);
            void simular();
        }
    }, [open, simular]);

    const aplicar = async () => {
        try {
            setAplicando(true);
            setError(null);
            setResultado(await sincronizarReceptoresCrm(modulo, true));
            setConfirmando(false);
            await onAplicado();
        } catch (err) {
            setError(mensajeError(err));
        } finally {
            setAplicando(false);
        }
    };

    if (!open) return null;

    const hayCambios =
        !!resultado && resultado.detalle.length > 0;

    const ocupado = cargando || aplicando;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
            <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
                {/* HEADER */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                    <div className="min-w-0">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                            <DatabaseZap size={20} className="text-cyan-600" />
                            Sincronizar desde el CRM
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Empresas activas con RUT y contactos marcados «Recibe {etiquetaModulo}». Los receptores
                            nuevos quedan <strong>no habilitados</strong>; lo existente no se modifica.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={aplicando}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                        aria-label="Cerrar"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* BODY */}
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                    {cargando && (
                        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                            <Loader2 size={18} className="animate-spin" />
                            Revisando empresas del CRM...
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {resultado && !cargando && (
                        <>
                            {resultado.aplicado && (
                                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                                    <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                                    Cambios aplicados. Los receptores nuevos quedaron sin habilitar: actívalos desde
                                    «Gestionar» cuando tengan contactos.
                                </div>
                            )}

                            {/* RESUMEN */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                                <Cifra label={resultado.aplicado ? "Creados" : "Por crear"} valor={resultado.receptoresCreados} clase="text-cyan-700" />
                                <Cifra label={resultado.aplicado ? "Vinculados" : "Por vincular"} valor={resultado.receptoresVinculados} clase="text-violet-700" />
                                <Cifra label="Contactos nuevos" valor={resultado.contactosCreados} clase="text-emerald-700" />
                                <Cifra label="Sin cambios" valor={resultado.sinCambios} />
                                <Cifra label="Sin RUT" valor={resultado.empresasSinRut} clase="text-amber-700" />
                            </div>

                            {resultado.contactosSinEmailValido > 0 && (
                                <Aviso>
                                    {resultado.contactosSinEmailValido} contacto(s) marcados tienen un email no válido y
                                    no se copian. Corrígelos en la ficha de la empresa.
                                </Aviso>
                            )}

                            {resultado.rutDuplicados.length > 0 && (
                                <Aviso>
                                    <div className="font-semibold">RUT repetido entre empresas (solo se usa la primera):</div>
                                    <ul className="mt-1 list-disc pl-5">
                                        {resultado.rutDuplicados.map((d) => (
                                            <li key={d.rut}>
                                                {formatRut(d.rut)}: {d.empresas.join(", ")}
                                            </li>
                                        ))}
                                    </ul>
                                </Aviso>
                            )}

                            {resultado.errores.length > 0 && (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                                    <div className="font-semibold">No se pudieron sincronizar:</div>
                                    <ul className="mt-1 list-disc pl-5">
                                        {resultado.errores.map((e) => (
                                            <li key={e.rut}>
                                                {e.empresa} ({formatRut(e.rut)}): {e.error}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* DETALLE */}
                            {hayCambios ? (
                                <div className="overflow-hidden rounded-xl border border-slate-200">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left">Empresa</th>
                                                <th className="px-4 py-2.5 text-left">RUT</th>
                                                <th className="px-4 py-2.5 text-left">Acción</th>
                                                <th className="px-4 py-2.5 text-left">Contactos nuevos</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {resultado.detalle.map((d) => (
                                                <tr key={d.empresaId}>
                                                    <td className="px-4 py-2.5 font-medium text-slate-800">{d.empresa}</td>
                                                    <td className="px-4 py-2.5 text-slate-500">{formatRut(d.rut)}</td>
                                                    <td className="px-4 py-2.5">
                                                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${ACCION[d.accion].clase}`}>
                                                            {ACCION[d.accion].texto}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-xs text-slate-600">
                                                        {d.contactosNuevos.length > 0
                                                            ? d.contactosNuevos.join(", ")
                                                            : <span className="text-slate-400">—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                !resultado.aplicado && (
                                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                                        <CheckCircle2 size={18} className="shrink-0" />
                                        Todo está sincronizado: no hay receptores ni contactos por agregar.
                                    </div>
                                )
                            )}

                            {/* SIN RUT */}
                            {(resultado.empresasSinRutDetalle?.length ?? 0) > 0 && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                    <div className="font-semibold">
                                        Empresas activas sin RUT (complétalo en la ficha de la empresa):
                                    </div>
                                    <div className="mt-1">
                                        {resultado.empresasSinRutDetalle?.map((e) => e.empresa).join(", ")}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* FOOTER */}
                <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
                    {confirmando ? (
                        <>
                            <span className="text-sm text-slate-600 sm:mr-auto">
                                ¿Aplicar {resultado?.receptoresCreados ?? 0} receptor(es) nuevo(s),{" "}
                                {resultado?.receptoresVinculados ?? 0} vínculo(s) y{" "}
                                {resultado?.contactosCreados ?? 0} contacto(s)?
                            </span>
                            <button
                                type="button"
                                onClick={() => setConfirmando(false)}
                                disabled={aplicando}
                                className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                                Volver
                            </button>
                            <button
                                type="button"
                                onClick={() => void aplicar()}
                                disabled={aplicando}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
                            >
                                {aplicando && <Loader2 size={16} className="animate-spin" />}
                                Sí, aplicar
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={aplicando}
                                className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                                Cerrar
                            </button>
                            {resultado && !resultado.aplicado && hayCambios && (
                                <button
                                    type="button"
                                    onClick={() => setConfirmando(true)}
                                    disabled={ocupado}
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
                                >
                                    <DatabaseZap size={16} />
                                    Aplicar cambios
                                </button>
                            )}
                            {resultado?.aplicado && (
                                <button
                                    type="button"
                                    onClick={() => void simular()}
                                    disabled={ocupado}
                                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                >
                                    Revisar de nuevo
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/* =========================================================
   PIEZAS
========================================================= */

function Cifra({ label, valor, clase = "text-slate-900" }: { label: string; valor: number; clase?: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-xs font-medium text-slate-500">{label}</div>
            <div className={`mt-1 text-2xl font-bold ${clase}`}>{valor}</div>
        </div>
    );
}

function Aviso({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>{children}</div>
        </div>
    );
}