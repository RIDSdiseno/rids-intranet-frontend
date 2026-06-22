// src/components/modals-equipos/EquipoEdit.tsx
import React, { useEffect, useState } from "react";
import { DatePicker } from "antd";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { http } from "../../service/http";
import {
    TipoEquipo,
    TipoEquipoLabel,
    type TipoEquipoValue,
} from "../modals-gestioo/types";
import type {
    EmpresaOpt,
    EquipoAdicional,
    EquipoForm,
    EquipoRow,
    EstadoEquipo,
    SolicitanteLite,
} from "./equipos.types";
import {
    ADICIONAL_TIPOS,
    ESTADO_EQUIPO_OPTIONS,
    REQUIRED_FIELDS_BY_TIPO,
    clsx,
    formatRut,
    getAnioPcOrigenLabel,
} from "./equipos.helpers";

type Props = {
    open: boolean;
    row: EquipoRow | null;
    empresaOptions: EmpresaOpt[];
    onClose: () => void;
    onSaved: () => void;
};

function useDebouncedValue<T>(value: T, delay = 400): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);

    return debounced;
}

function getApiErrorData(err: unknown): any {
    return (err as any)?.response?.data ?? null;
}

function getApiErrorMessage(err: unknown): string {
    const data = getApiErrorData(err);

    return (
        data?.message ||
        data?.error ||
        (err instanceof Error ? err.message : "") ||
        "Ocurrió un error inesperado"
    );
}

function isSerialDuplicadoError(err: unknown): boolean {
    const data = getApiErrorData(err);
    const msg = getApiErrorMessage(err).toLowerCase();

    return (
        data?.code === "SERIAL_DUPLICADO" ||
        data?.field === "serial" ||
        (msg.includes("serial") && (msg.includes("existe") || msg.includes("duplic")))
    );
}

const initialForm: EquipoForm = {
    serial: "",
    tipo: TipoEquipo.GENERICO,
    marca: "",
    modelo: "",
    anioPc: "",
    procesador: "",
    ram: "",
    disco: "",
    propiedad: "",
    observaciones: "",
    estado: "ACTIVO",

    macWifi: "",
    redEthernet: "",
    so: "",
    tipoDd: "",
    estadoAlm: "",
    office: "",
    teamViewer: "",
    claveTv: "",
    revisado: "",
    adminRidsUsuario: "",
    adminRidsPassword: "",
    usuarioEmpresa: "",
    passwordEmpresa: "",
    usuarioPersonal: "",
    passwordPersonal: "",
};

export default function EquipoEditModal({
    open,
    row,
    empresaOptions,
    onClose,
    onSaved,
}: Props) {
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [editFieldError, setEditFieldError] = useState<keyof EquipoForm | null>(null);

    const [form, setForm] = useState<EquipoForm>(initialForm);
    const [anioPcTouched, setAnioPcTouched] = useState(false);

    const [adicionales, setAdicionales] = useState<EquipoAdicional[]>([]);

    const [empresaId, setEmpresaId] = useState<number | null>(null);
    const [solicitanteId, setSolicitanteId] = useState<number | null>(null);

    const [solSearch, setSolSearch] = useState("");
    const solSearchDeb = useDebouncedValue(solSearch, 300);
    const [solOpts, setSolOpts] = useState<SolicitanteLite[]>([]);
    const [solLoading, setSolLoading] = useState(false);

    useEffect(() => {
        if (!open || !row) return;

        setForm({
            serial: row.serial || "",
            tipo: row.tipo ?? TipoEquipo.GENERICO,
            marca: row.marca || "",
            modelo: row.modelo || "",
            anioPc: row.anioPc ? String(row.anioPc) : "",
            procesador: row.procesador || "",
            ram: row.ram || "",
            disco: row.disco || "",
            propiedad: row.propiedad || "",
            observaciones: row.observaciones || "",
            estado: (row.estado ?? "ACTIVO") as EstadoEquipo,

            macWifi: row.macWifi || "",
            redEthernet: row.redEthernet || "",
            so: row.so || "",
            tipoDd: row.tipoDd || "",
            estadoAlm: row.estadoAlm || "",
            office: row.office || "",
            teamViewer: row.teamViewer || "",
            claveTv: row.claveTv || "",
            revisado: row.revisado || "",
            adminRidsUsuario: row.adminRidsUsuario || "",
            adminRidsPassword: row.adminRidsPassword || "",
            usuarioEmpresa: row.usuarioEmpresa || "",
            passwordEmpresa: row.passwordEmpresa || "",
            usuarioPersonal: row.usuarioPersonal || "",
            passwordPersonal: row.passwordPersonal || "",
        });

        setAdicionales(row.adicionales ?? []);
        setEmpresaId(row.empresaId ?? null);
        setSolicitanteId(row.idSolicitante ?? null);
        setSolSearch("");
        setEditError(null);
        setEditFieldError(null);
        setAnioPcTouched(false);
    }, [open, row]);

    useEffect(() => {
        if (!open) return;
        void loadSolicitantes(empresaId, solSearchDeb);
    }, [open, empresaId, solSearchDeb]);

    async function fetchSolicitantesByEmpresa(
        empresaIdValue: number,
        search?: string
    ): Promise<SolicitanteLite[]> {
        const cleanSearch = search?.trim() || "";

        const res = await http.get("/solicitantes/by-empresa", {
            params: {
                empresaId: empresaIdValue,
                q: cleanSearch || undefined,
                orderBy: "nombre",
                orderDir: "asc",
            },
        });

        return res.data.items.map((it: {
            id: number;
            nombre: string;
            email?: string | null;
            rut?: string | null;
        }) => ({
            id_solicitante: it.id,
            nombre: it.nombre,
            email: it.email ?? null,
            rut: it.rut ?? null,
            empresa: { id_empresa: empresaIdValue, nombre: "" },
        }));
    }

    async function loadSolicitantes(empresaIdValue: number | null, term: string) {
        if (empresaIdValue == null) {
            setSolOpts([]);
            return;
        }

        setSolLoading(true);

        try {
            const solicitantes = await fetchSolicitantesByEmpresa(empresaIdValue, term);
            setSolOpts(solicitantes);
        } catch {
            setSolOpts([]);
        } finally {
            setSolLoading(false);
        }
    }

    const requiredFields =
        REQUIRED_FIELDS_BY_TIPO[form.tipo] ?? REQUIRED_FIELDS_BY_TIPO[TipoEquipo.GENERICO];

    const requiresProcesador = requiredFields.procesador;
    const requiresRam = requiredFields.ram;
    const requiresDisco = requiredFields.disco;

    const handleClose = () => {
        if (saving) return;
        onClose();
    };

    const save = async () => {
        if (!row) return;

        const requiredKeys: Array<keyof EquipoForm> = [
            "serial",
            "tipo",
            "marca",
            "modelo",
            "propiedad",
        ];

        if (requiresProcesador) requiredKeys.push("procesador");
        if (requiresRam) requiredKeys.push("ram");
        if (requiresDisco) requiredKeys.push("disco");

        for (const k of requiredKeys) {
            if (!String(form[k] ?? "").trim()) {
                setEditFieldError(k);
                setEditError(`El campo "${String(k).toUpperCase()}" es obligatorio.`);
                return;
            }
        }

        if (empresaId == null) {
            setEditError("Debes seleccionar una empresa.");
            return;
        }

        if (!solicitanteId) {
            setEditError("Debes seleccionar un solicitante.");
            return;
        }

        try {
            setSaving(true);

            const hoy = dayjs().format("YYYY-MM-DD");
            const { anioPc, ...baseEditForm } = form;

            const payload: any = {
                ...baseEditForm,
                tipo: form.tipo,
                observaciones: form.observaciones.trim() || null,

                procesador: requiresProcesador ? form.procesador.trim() : "N/A",
                ram: requiresRam ? form.ram.trim() : "N/A",
                disco: requiresDisco ? form.disco.trim() : "N/A",

                revisado: hoy,
                idSolicitante: solicitanteId,
                empresaId,

                adicionales: adicionales
                    .filter((a) => !!a?.tipo?.trim())
                    .map((a) => ({
                        tipo: a.tipo.trim(),
                        descripcion: a.descripcion?.trim() || null,
                        cantidad: Number(a.cantidad) > 0 ? Number(a.cantidad) : 1,
                        serialAdicional: a.serialAdicional?.trim() || null,
                    })),
            };

            if (anioPcTouched) {
                payload.anioPc = anioPc.trim() ? Number(anioPc) : null;
            }

            await http.patch(`/equipos/${row.id_equipo}`, payload);

            onSaved();
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err);

            if (isSerialDuplicadoError(err)) {
                setEditFieldError("serial");
                setEditError(msg || "Ya existe un equipo registrado con ese serial.");
                return;
            }

            setEditError(msg || "No se pudo actualizar el equipo");
        } finally {
            setSaving(false);
        }
    };

    if (!open || !row) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6"
        >
            <div className="absolute inset-0 bg-slate-900/40" />

            <div className="relative flex h-[94dvh] w-full max-w-[950px] flex-col overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-2xl">
                {/* Header */}
                <div className="shrink-0 border-b border-cyan-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                                Editar equipo #{row.id_equipo}
                            </h3>
                            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                                Actualiza la ficha del equipo, datos técnicos, accesos y adicionales.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleClose}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                            aria-label="Cerrar"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Contenido */}
                <div
                    className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-3 py-4 sm:px-5 lg:px-8 lg:py-6"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            save();
                        }
                    }}
                >
                    <div className="mx-auto w-full max-w-[1320px] space-y-4">
                        {editError && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                <div className="font-semibold">No se pudo guardar el equipo</div>
                                <div>{editError}</div>
                            </div>
                        )}

                        {/* Relación */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            <div className="mb-4">
                                <h4 className="text-sm font-semibold text-slate-800">
                                    Relación
                                </h4>
                                <p className="mt-1 text-xs text-slate-500">
                                    Empresa y solicitante asociados al equipo.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                <label className="text-sm">
                                    <span className="mb-1 block text-slate-700">
                                        Empresa <span className="text-rose-500">*</span>
                                    </span>

                                    <select
                                        value={empresaId ?? ""}
                                        onChange={(e) => {
                                            const val = e.target.value ? Number(e.target.value) : null;
                                            setEmpresaId(val);
                                            setSolicitanteId(null);
                                            setSolSearch("");
                                            setSolOpts([]);
                                        }}
                                        className="w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                    >
                                        <option value="">— Selecciona empresa —</option>
                                        {empresaOptions.map((opt) => (
                                            <option key={opt.id ?? -1} value={opt.id ?? ""}>
                                                {opt.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="text-sm">
                                    <span className="mb-1 block text-slate-700">
                                        Solicitante <span className="text-rose-500">*</span>
                                    </span>

                                    <div className="flex gap-2">
                                        <input
                                            value={solSearch}
                                            onChange={(e) => setSolSearch(e.target.value)}
                                            placeholder="Buscar por nombre, apellido, email o teléfono…"
                                            className="w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                            disabled={empresaId == null}
                                        />

                                        {solLoading ? (
                                            <span className="inline-flex items-center px-2 text-slate-500">
                                                <LoadingOutlined />
                                            </span>
                                        ) : null}
                                    </div>

                                    <select
                                        value={solicitanteId ?? ""}
                                        onChange={(e) => setSolicitanteId(e.target.value ? Number(e.target.value) : null)}
                                        className="mt-2 w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                        disabled={empresaId == null}
                                    >
                                        <option value="">{solLoading ? "Cargando…" : "— Selecciona —"}</option>

                                        {solOpts.map((s) => (
                                            <option key={s.id_solicitante} value={s.id_solicitante}>
                                                {s.nombre}
                                                {s.rut ? ` — RUT: ${formatRut(s.rut)}` : ""}
                                                {s.email ? ` — ${s.email}` : ""}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="mt-1 text-[11px] text-slate-500">
                                        Si el equipo cambió de empresa, primero selecciona la nueva empresa para listar sus solicitantes.
                                    </div>
                                </label>
                            </div>
                        </section>

                        {/* Datos principales */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            <div className="mb-4">
                                <h4 className="text-sm font-semibold text-slate-800">
                                    Datos principales
                                </h4>
                                <p className="mt-1 text-xs text-slate-500">
                                    Información base del equipo, estado, propiedad y características generales.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                <label className="text-sm sm:col-span-2 xl:col-span-3">
                                    <span className="mb-1 block text-slate-700">
                                        Tipo de equipo <span className="text-rose-500">*</span>
                                    </span>

                                    <select
                                        value={form.tipo}
                                        onChange={(e) => {
                                            const tipo = e.target.value as TipoEquipoValue;
                                            const nextRequired =
                                                REQUIRED_FIELDS_BY_TIPO[tipo] ?? REQUIRED_FIELDS_BY_TIPO[TipoEquipo.GENERICO];

                                            setForm((prev) => ({
                                                ...prev,
                                                tipo,
                                                procesador: nextRequired.procesador ? prev.procesador : "",
                                                ram: nextRequired.ram ? prev.ram : "",
                                                disco: nextRequired.disco ? prev.disco : "",
                                            }));

                                            setEditError(null);
                                            setEditFieldError(null);
                                        }}
                                        className="w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                    >
                                        {Object.values(TipoEquipo).map((tipo) => (
                                            <option key={tipo} value={tipo}>
                                                {TipoEquipoLabel[tipo]}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="mt-1 text-[11px] text-slate-500">
                                        {requiresProcesador || requiresRam || requiresDisco
                                            ? "Este tipo de equipo requiere datos técnicos específicos."
                                            : "Este tipo de equipo no requiere CPU, RAM ni Disco. Se guardarán como N/A."}
                                    </div>
                                </label>

                                {[
                                    { key: "serial", label: "Serial", autoCap: true, required: true },
                                    { key: "marca", label: "Marca", autoCap: true, required: true },
                                    { key: "modelo", label: "Modelo", required: true },
                                    {
                                        key: "procesador",
                                        label: requiresProcesador ? "CPU" : "CPU (no aplica)",
                                        required: requiresProcesador,
                                        disabled: !requiresProcesador,
                                    },
                                    {
                                        key: "ram",
                                        label: requiresRam ? "RAM" : "RAM (no aplica)",
                                        required: requiresRam,
                                        disabled: !requiresRam,
                                    },
                                    {
                                        key: "disco",
                                        label: requiresDisco ? "Disco" : "Disco (no aplica)",
                                        required: requiresDisco,
                                        disabled: !requiresDisco,
                                    },
                                    { key: "propiedad", label: "Propiedad", required: true },
                                ].map((f) => {
                                    const key = f.key as keyof EquipoForm;

                                    return (
                                        <label key={String(key)} className="text-sm">
                                            <span className="mb-1 block text-slate-700">
                                                {f.label} {f.required && <span className="text-rose-500">*</span>}
                                            </span>

                                            <input
                                                required={f.required}
                                                disabled={f.disabled}
                                                value={form[key]}
                                                onChange={(e) => {
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        [key]: e.target.value,
                                                    }));

                                                    if (editFieldError === key) {
                                                        setEditFieldError(null);
                                                        setEditError(null);
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    const v = e.target.value.trim();
                                                    const next = f.autoCap ? v.toUpperCase() : v.replace(/\s{2,}/g, " ");

                                                    if (next !== form[key]) {
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            [key]: next,
                                                        }));
                                                    }
                                                }}
                                                placeholder={f.label}
                                                className={clsx(
                                                    "w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2",
                                                    f.disabled
                                                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                                        : editFieldError === key
                                                            ? "border-rose-400 bg-rose-50 focus:ring-rose-500/30"
                                                            : "border-cyan-200 focus:ring-cyan-500/30"
                                                )}
                                            />

                                            {editFieldError === key && editError && (
                                                <div className="mt-1 text-xs font-medium text-rose-600">
                                                    {editError}
                                                </div>
                                            )}
                                        </label>
                                    );
                                })}

                                <label className="text-sm">
                                    <span className="mb-1 block text-slate-700">Año PC</span>

                                    <input
                                        type="number"
                                        min={2000}
                                        max={new Date().getFullYear() + 1}
                                        value={form.anioPc}
                                        onChange={(e) => {
                                            setAnioPcTouched(true);
                                            setForm((prev) => ({
                                                ...prev,
                                                anioPc: e.target.value,
                                            }));
                                        }}
                                        placeholder="Ej: 2022"
                                        className="w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                    />

                                    <div className="mt-1 text-[11px] text-slate-500">
                                        Origen actual: {getAnioPcOrigenLabel(row.anioPcOrigen)}.
                                        Si modificas este campo, quedará como manual.
                                    </div>
                                </label>

                                <label className="text-sm">
                                    <span className="mb-1 block text-slate-700">
                                        Estado del equipo <span className="text-rose-500">*</span>
                                    </span>

                                    <select
                                        value={form.estado}
                                        onChange={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                estado: e.target.value as EstadoEquipo,
                                            }))
                                        }
                                        className="w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                    >
                                        {ESTADO_EQUIPO_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="text-sm sm:col-span-2 xl:col-span-3">
                                    <span className="mb-1 block text-slate-700">Observaciones</span>

                                    <textarea
                                        value={form.observaciones}
                                        onChange={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                observaciones: e.target.value,
                                            }))
                                        }
                                        rows={3}
                                        maxLength={1000}
                                        placeholder="Ingrese observaciones generales del equipo..."
                                        className="w-full resize-y rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                    />

                                    <div className="mt-1 text-[11px] text-slate-500">
                                        {form.observaciones.length}/1000 caracteres
                                    </div>
                                </label>

                                <div className="text-[11px] text-slate-500 sm:col-span-2 xl:col-span-3">
                                    Los campos marcados con <span className="text-rose-500">*</span> son obligatorios.
                                </div>
                            </div>
                        </section>

                        {/* Detalles técnicos */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            <div className="mb-4">
                                <h4 className="text-sm font-semibold text-slate-800">
                                    Detalles técnicos
                                </h4>
                                <p className="mt-1 text-xs text-slate-500">
                                    Conectividad, sistema operativo, almacenamiento, Office y acceso remoto.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                                {[
                                    { key: "macWifi", label: "MAC WiFi", placeholder: "00:1A:2B:3C:4D:5E" },
                                    { key: "redEthernet", label: "MAC Ethernet", placeholder: "00:1A:2B:3C:4D:5F" },
                                    { key: "so", label: "Sistema Operativo", placeholder: "Ej: Windows 11 Pro" },
                                    { key: "tipoDd", label: "Tipo Disco", placeholder: "Ej: SSD / HDD / NVMe" },
                                    { key: "estadoAlm", label: "Estado Almacenamiento", placeholder: "Ej: 97% BUENO" },
                                    { key: "office", label: "Office", placeholder: "Ej: Office 365 / 2019" },
                                    { key: "teamViewer", label: "TeamViewer", placeholder: "ID TeamViewer" },
                                    { key: "claveTv", label: "Clave TeamViewer", placeholder: "Contraseña TeamViewer" },
                                ].map((f) => {
                                    const key = f.key as keyof EquipoForm;

                                    return (
                                        <label key={String(key)} className="text-sm">
                                            <span className="mb-1 block text-slate-600">{f.label}</span>

                                            <input
                                                value={form[key]}
                                                placeholder={f.placeholder}
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        [key]: e.target.value,
                                                    }))
                                                }
                                                className="w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                            />
                                        </label>
                                    );
                                })}

                                <label className="text-sm">
                                    <span className="mb-1 block text-slate-600">Revisado</span>

                                    <DatePicker
                                        allowClear
                                        value={form.revisado && dayjs(form.revisado).isValid() ? dayjs(form.revisado) : null}
                                        onChange={(date) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                revisado: date ? date.format("YYYY-MM-DD") : "",
                                            }))
                                        }
                                        format="DD/MM/YYYY"
                                        className="w-full"
                                    />
                                </label>
                            </div>
                        </section>

                        {/* Accesos y usuarios */}
                        <section className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm sm:p-5">
                            <div className="mb-4">
                                <h4 className="text-sm font-semibold text-slate-800">
                                    Accesos y usuarios
                                </h4>
                                <p className="mt-1 text-xs text-slate-500">
                                    Credenciales registradas para administración y usuarios del equipo.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 text-sm xl:grid-cols-3">
                                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                                    <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                        Administrador RIDS
                                    </div>

                                    <div className="space-y-3">
                                        <input
                                            placeholder="Usuario Admin RIDS"
                                            value={form.adminRidsUsuario}
                                            onChange={(e) => setForm((prev) => ({ ...prev, adminRidsUsuario: e.target.value }))}
                                            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                        />

                                        <input
                                            placeholder="Contraseña Admin RIDS"
                                            value={form.adminRidsPassword}
                                            onChange={(e) => setForm((prev) => ({ ...prev, adminRidsPassword: e.target.value }))}
                                            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                                    <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                        Usuario Empresa
                                    </div>

                                    <div className="space-y-3">
                                        <input
                                            placeholder="Usuario Empresa"
                                            value={form.usuarioEmpresa}
                                            onChange={(e) => setForm((prev) => ({ ...prev, usuarioEmpresa: e.target.value }))}
                                            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                        />

                                        <input
                                            placeholder="Contraseña Usuario Empresa"
                                            value={form.passwordEmpresa}
                                            onChange={(e) => setForm((prev) => ({ ...prev, passwordEmpresa: e.target.value }))}
                                            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                                    <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                        Usuario Personal
                                    </div>

                                    <div className="space-y-3">
                                        <input
                                            placeholder="Usuario Personal"
                                            value={form.usuarioPersonal}
                                            onChange={(e) => setForm((prev) => ({ ...prev, usuarioPersonal: e.target.value }))}
                                            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                        />

                                        <input
                                            placeholder="Contraseña Usuario Personal"
                                            value={form.passwordPersonal}
                                            onChange={(e) => setForm((prev) => ({ ...prev, passwordPersonal: e.target.value }))}
                                            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Adicionales */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-800">
                                        Adicionales
                                    </h4>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Periféricos, accesorios u otros elementos asociados al equipo.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setAdicionales((prev) => [
                                            ...prev,
                                            {
                                                id: Date.now(),
                                                tipo: "",
                                                descripcion: "",
                                                cantidad: 1,
                                                serialAdicional: "",
                                            },
                                        ])
                                    }
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm hover:bg-cyan-50 sm:w-auto"
                                >
                                    <PlusOutlined />
                                    Agregar
                                </button>
                            </div>

                            {adicionales.length === 0 ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                    Sin adicionales registrados.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {adicionales.map((a, idx) => (
                                        <div
                                            key={`${a.id}-${idx}`}
                                            className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-4"
                                        >
                                            <select
                                                value={a.tipo || ""}
                                                onChange={(e) =>
                                                    setAdicionales((prev) =>
                                                        prev.map((x, i) => (i === idx ? { ...x, tipo: e.target.value } : x))
                                                    )
                                                }
                                                className="w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                            >
                                                <option value="">Selecciona un tipo</option>
                                                {ADICIONAL_TIPOS.map((tipo) => (
                                                    <option key={tipo} value={tipo}>
                                                        {tipo}
                                                    </option>
                                                ))}
                                            </select>

                                            <input
                                                type="number"
                                                min={1}
                                                value={String(a.cantidad ?? 1)}
                                                onChange={(e) =>
                                                    setAdicionales((prev) =>
                                                        prev.map((x, i) =>
                                                            i === idx ? { ...x, cantidad: Number(e.target.value) || 1 } : x
                                                        )
                                                    )
                                                }
                                                placeholder="Cantidad"
                                                className="w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                            />

                                            <input
                                                value={a.descripcion || ""}
                                                onChange={(e) =>
                                                    setAdicionales((prev) =>
                                                        prev.map((x, i) => (i === idx ? { ...x, descripcion: e.target.value } : x))
                                                    )
                                                }
                                                placeholder="Descripción"
                                                className="w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                            />

                                            <div className="flex gap-2">
                                                <input
                                                    value={a.serialAdicional || ""}
                                                    onChange={(e) =>
                                                        setAdicionales((prev) =>
                                                            prev.map((x, i) =>
                                                                i === idx ? { ...x, serialAdicional: e.target.value } : x
                                                            )
                                                        )
                                                    }
                                                    placeholder="Serial adicional"
                                                    className="w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() => setAdicionales((prev) => prev.filter((_, i) => i !== idx))}
                                                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100"
                                                >
                                                    Quitar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-cyan-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={saving}
                            className={clsx(
                                "inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm sm:w-auto",
                                "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                                saving && "cursor-not-allowed opacity-50"
                            )}
                        >
                            Cancelar
                        </button>

                        <button
                            type="button"
                            onClick={save}
                            disabled={saving}
                            className={clsx(
                                "inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium text-white sm:w-auto",
                                "bg-gradient-to-tr from-indigo-600 to-cyan-600 hover:brightness-110",
                                saving && "cursor-not-allowed opacity-60"
                            )}
                        >
                            {saving ? "Guardando…" : "Guardar cambios"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
