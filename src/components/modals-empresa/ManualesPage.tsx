// src/components/modals-empresa/ManualesPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
    BookOutlined,
    PlusOutlined,
    ReloadOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    VideoCameraOutlined,
    FileTextOutlined,
    LoadingOutlined,
} from "@ant-design/icons";
import { Select, Switch } from "antd";
import { http } from "../../service/http";
import { useAuth } from "../hooks/useAuth";

type TipoManualTutorial = "MANUAL" | "VIDEO" | "GUIA" | "PROCEDIMIENTO";

type EmpresaLite = {
    id_empresa: number;
    nombre: string;
};

type ArchivoManual = {
    nombreArchivo: string;
    urlArchivo: string;
};

type ManualTutorial = {
    id: number;
    titulo: string;
    descripcion?: string | null;
    categoria?: string | null;
    problema?: string | null;
    solucion?: string | null;
    tipo: TipoManualTutorial;
    empresaId?: number | null;
    empresa?: EmpresaLite | null;
    urlArchivo?: string | null;
    urlVideo?: string | null;
    plataforma?: string | null;
    visibleCliente: boolean;
    activo: boolean;
    createdAt: string;
    updatedAt: string;

    archivos?: ArchivoManual[];
};

type ManualForm = {
    titulo: string;
    descripcion: string;
    categoria: string;
    problema: string;
    solucion: string;
    tipo: TipoManualTutorial | "";
    empresaId: string;
    archivos: ArchivoManual[];
    urlVideo: string;
    plataforma: string;
    visibleCliente: boolean;
    activo: boolean;
};

type ManualesTutorialesPageProps = {
    embedded?: boolean;
};

const TIPO_OPTIONS: Array<{ value: TipoManualTutorial; label: string }> = [
    { value: "MANUAL", label: "Manual" },
    { value: "VIDEO", label: "Video" },
    { value: "GUIA", label: "Guía" },
    { value: "PROCEDIMIENTO", label: "Procedimiento" },
];

const CATEGORIA_OPTIONS: Array<{ value: string; label: string }> = [
    { value: "Microsoft 365", label: "Microsoft 365" },
    { value: "Correo Outlook", label: "Correo Outlook" },
    { value: "Correo Gmail", label: "Correo Gmail" },
    { value: "Impresoras", label: "Impresoras" },
    { value: "Red", label: "Red" },
    { value: "Equipos", label: "Equipos" },
    { value: "Windows", label: "Windows" },
    { value: "MacOS", label: "MacOS" },
    { value: "VPN", label: "VPN" },
    { value: "Seguridad", label: "Seguridad" },
    { value: "Procedimientos internos", label: "Procedimientos internos" },
    { value: "Soporte general", label: "Soporte general" },
    { value: "Softland", label: "Softland" },
    { value: "Hyperrenta", label: "Hyperrenta" },
];

const PLATAFORMA_OPTIONS: Array<{ value: string; label: string }> = [
    { value: "SharePoint", label: "SharePoint" },
    { value: "OneDrive", label: "OneDrive" },
    { value: "YouTube", label: "YouTube" },
    { value: "Google Drive", label: "Google Drive" },
    { value: "URL externa", label: "URL externa" },
    { value: "Archivo local", label: "Archivo local" },
];

const emptyForm: ManualForm = {
    titulo: "",
    descripcion: "",
    categoria: "",
    problema: "",
    solucion: "",
    tipo: "",
    empresaId: "",
    archivos: [],
    urlVideo: "",
    plataforma: "",
    visibleCliente: false,
    activo: true,
};

function getTipoLabel(tipo: TipoManualTutorial) {
    return TIPO_OPTIONS.find((x) => x.value === tipo)?.label ?? tipo;
}

function getTipoClass(tipo: TipoManualTutorial) {
    switch (tipo) {
        case "VIDEO":
            return "bg-purple-50 text-purple-700 border-purple-200";
        case "GUIA":
            return "bg-cyan-50 text-cyan-700 border-cyan-200";
        case "PROCEDIMIENTO":
            return "bg-amber-50 text-amber-700 border-amber-200";
        case "MANUAL":
        default:
            return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
}

function getErrorMessage(error: unknown) {
    const data = (error as any)?.response?.data;

    return (
        data?.message ||
        data?.error ||
        (error instanceof Error ? error.message : "") ||
        "Ocurrió un error inesperado"
    );
}

function formatFecha(value?: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("es-CL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);
}

function resourceCount(item: ManualTutorial) {
    let count = 0;

    if (Array.isArray(item.archivos) && item.archivos.length > 0) {
        count += item.archivos.length;
    } else if (item.urlArchivo) {
        count += 1;
    }

    if (item.urlVideo) count += 1;

    return count;
}

const ManualesTutorialesPage: React.FC<ManualesTutorialesPageProps> = ({
    embedded = false,
}) => {
    const { isCliente } = useAuth();

    const [items, setItems] = useState<ManualTutorial[]>([]);
    const [empresas, setEmpresas] = useState<EmpresaLite[]>([]);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState("");
    const [empresaFiltro, setEmpresaFiltro] = useState<string>("todas");
    const [tipoFiltro, setTipoFiltro] = useState<TipoManualTutorial | "todos">("todos");

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ManualTutorial | null>(null);
    const [viewing, setViewing] = useState<ManualTutorial | null>(null);

    const [form, setForm] = useState<ManualForm>(emptyForm);

    const [uploadingFile, setUploadingFile] = useState(false);

    const [toast, setToast] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    const fetchItems = async () => {
        try {
            setLoading(true);

            const { data } = await http.get("/manuales-tutoriales");

            const list = Array.isArray(data)
                ? data
                : Array.isArray(data?.items)
                    ? data.items
                    : Array.isArray(data?.data)
                        ? data.data
                        : [];

            setItems(list);
        } catch (error) {
            console.error(error);
            setToast({
                type: "error",
                message: "Error al cargar manuales y procedimientos",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchEmpresas = async () => {
        if (isCliente) return;

        try {
            const { data } = await http.get("/empresas", {
                params: {
                    page: 1,
                    pageSize: 1000,
                },
            });

            const list = Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                    ? data.data
                    : Array.isArray(data?.items)
                        ? data.items
                        : [];

            setEmpresas(
                list
                    .map((e: any) => ({
                        id_empresa: Number(e.id_empresa),
                        nombre: String(e.nombre ?? ""),
                    }))
                    .filter((e: EmpresaLite) => Number.isFinite(e.id_empresa) && e.nombre)
                    .sort((a: EmpresaLite, b: EmpresaLite) =>
                        a.nombre.localeCompare(b.nombre, "es")
                    )
            );
        } catch (error) {
            console.error(error);
            setEmpresas([]);
        }
    };

    const uploadArchivosManual = async (files: FileList | File[]) => {
        const fileArray = Array.from(files);

        if (fileArray.length === 0) return;

        try {
            setUploadingFile(true);

            const archivosSubidos: ArchivoManual[] = [];

            for (const file of fileArray) {
                const formDataUpload = new FormData();
                formDataUpload.append("file", file);

                const { data } = await http.post(
                    "/manuales-tutoriales/upload",
                    formDataUpload,
                    {
                        headers: {
                            "Content-Type": "multipart/form-data",
                        },
                    }
                );

                archivosSubidos.push({
                    nombreArchivo: data.nombreArchivo ?? file.name,
                    urlArchivo: data.urlArchivo ?? "",
                });
            }

            setForm((prev) => ({
                ...prev,
                archivos: [
                    ...prev.archivos,
                    ...archivosSubidos.filter((archivo) => archivo.urlArchivo),
                ],
            }));

            setToast({
                type: "success",
                message:
                    archivosSubidos.length === 1
                        ? "Archivo subido correctamente"
                        : `${archivosSubidos.length} archivos subidos correctamente`,
            });
        } catch (error) {
            console.error(error);

            setToast({
                type: "error",
                message: getErrorMessage(error) || "No se pudieron subir los archivos",
            });
        } finally {
            setUploadingFile(false);
        }
    };

    useEffect(() => {
        void fetchItems();
        void fetchEmpresas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!toast) return;

        const timer = window.setTimeout(() => {
            setToast(null);
        }, 4000);

        return () => window.clearTimeout(timer);
    }, [toast]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();

        return items.filter((item) => {
            const matchesSearch =
                !q ||
                item.titulo.toLowerCase().includes(q) ||
                String(item.descripcion ?? "").toLowerCase().includes(q) ||
                String(item.categoria ?? "").toLowerCase().includes(q) ||
                String(item.problema ?? "").toLowerCase().includes(q) ||
                String(item.solucion ?? "").toLowerCase().includes(q) ||
                String(item.empresa?.nombre ?? "").toLowerCase().includes(q);

            const matchesEmpresa =
                empresaFiltro === "todas" ||
                String(item.empresaId ?? "") === empresaFiltro;

            const matchesTipo =
                tipoFiltro === "todos" || item.tipo === tipoFiltro;

            return matchesSearch && matchesEmpresa && matchesTipo;
        });
    }, [items, search, empresaFiltro, tipoFiltro]);

    const resumen = useMemo(() => {
        return {
            total: items.length,
            visiblesCliente: items.filter((item) => item.visibleCliente).length,
            videos: items.filter((item) => item.tipo === "VIDEO").length,
            conArchivo: items.filter(
                (item) =>
                    (Array.isArray(item.archivos) && item.archivos.length > 0) ||
                    Boolean(item.urlArchivo)
            ).length,
        };
    }, [items]);

    const startCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const startEdit = (item: ManualTutorial) => {
        setEditing(item);

        setForm({
            titulo: item.titulo ?? "",
            descripcion: item.descripcion ?? "",
            categoria: item.categoria ?? "",
            problema: item.problema ?? "",
            solucion: item.solucion ?? "",
            tipo: item.tipo ?? "MANUAL",
            empresaId: item.empresaId ? String(item.empresaId) : "",
            archivos:
                Array.isArray(item.archivos) && item.archivos.length > 0
                    ? item.archivos
                    : item.urlArchivo
                        ? [
                            {
                                nombreArchivo: "Archivo existente",
                                urlArchivo: item.urlArchivo,
                            },
                        ]
                        : [],
            urlVideo: item.urlVideo ?? "",
            plataforma: item.plataforma ?? "",
            visibleCliente: item.visibleCliente ?? false,
            activo: item.activo ?? true,
        });

        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving || uploadingFile) return;

        setModalOpen(false);
        setEditing(null);
        setForm(emptyForm);
    };

    const save = async () => {
        const titulo = form.titulo.trim();
        const categoria = form.categoria.trim();
        const problema = form.problema.trim();
        const solucion = form.solucion.trim();
        const plataforma = form.plataforma.trim();

        if (!titulo) {
            setToast({
                type: "error",
                message: "El título es obligatorio",
            });
            return;
        }

        if (!form.tipo) {
            setToast({
                type: "error",
                message: "El tipo es obligatorio",
            });
            return;
        }

        if (!categoria) {
            setToast({
                type: "error",
                message: "La categoría es obligatoria",
            });
            return;
        }

        if (!isCliente && !form.empresaId) {
            setToast({
                type: "error",
                message: "La empresa es obligatoria",
            });
            return;
        }

        if (!problema) {
            setToast({
                type: "error",
                message: "El problema es obligatorio",
            });
            return;
        }

        if (!solucion) {
            setToast({
                type: "error",
                message: "La solución es obligatoria",
            });
            return;
        }

        if (!plataforma) {
            setToast({
                type: "error",
                message: "La plataforma es obligatoria",
            });
            return;
        }

        try {
            setSaving(true);

            const payload = {
                titulo,
                descripcion: form.descripcion.trim() || null,
                categoria,
                problema,
                solucion,
                tipo: form.tipo,
                empresaId: form.empresaId ? Number(form.empresaId) : null,
                urlArchivo: form.archivos[0]?.urlArchivo ?? null,
                archivos: form.archivos,
                urlVideo: form.urlVideo.trim() || null,
                plataforma,
                visibleCliente: form.visibleCliente,
                activo: form.activo,
            };

            if (editing) {
                await http.put(`/manuales-tutoriales/${editing.id}`, payload);

                setToast({
                    type: "success",
                    message: "Manual o tutorial actualizado correctamente",
                });
            } else {
                await http.post("/manuales-tutoriales", payload);

                setToast({
                    type: "success",
                    message: "Manual o tutorial creado correctamente",
                });
            }

            closeModal();
            void fetchItems();
        } catch (error) {
            console.error(error);

            setToast({
                type: "error",
                message: getErrorMessage(error),
            });
        } finally {
            setSaving(false);
        }
    };

    const disableItem = async (item: ManualTutorial) => {
        if (!confirm(`¿Desactivar "${item.titulo}"?`)) return;

        try {
            await http.delete(`/manuales-tutoriales/${item.id}`);

            setToast({
                type: "success",
                message: "Manual o tutorial desactivado correctamente",
            });

            void fetchItems();
        } catch (error) {
            console.error(error);

            setToast({
                type: "error",
                message: getErrorMessage(error),
            });
        }
    };

    return (
        <div
            className={
                embedded
                    ? "space-y-5"
                    : "min-h-screen bg-gradient-to-b from-white via-white to-cyan-50 px-3 sm:px-6 lg:px-8 py-4 sm:py-6"
            }
        >
            <div className={embedded ? "w-full" : "max-w-[1800px] mx-auto"}>
                {/* Header / filtros */}
                <div className="rounded-2xl border border-slate-100 bg-white shadow-md overflow-hidden">
                    <div className="relative px-5 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-cyan-50">
                        <div className="absolute right-0 top-0 h-full w-44 bg-cyan-100/50 blur-3xl" />

                        <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 mb-3">
                                    <BookOutlined />
                                    Biblioteca interna
                                </div>

                                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                                    Manuales y procedimientos
                                </h2>

                                <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                                    Centraliza guías, videos, procedimientos y soluciones frecuentes asociadas a empresas o disponibles de forma general.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                                <button
                                    onClick={fetchItems}
                                    disabled={loading}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                    type="button"
                                >
                                    {loading ? <LoadingOutlined /> : <ReloadOutlined />}
                                    Recargar
                                </button>

                                {!isCliente && (
                                    <button
                                        onClick={startCreate}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.55)] hover:brightness-110 transition"
                                        type="button"
                                    >
                                        <PlusOutlined />
                                        Nuevo manual
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 p-5 border-b border-slate-100">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Total documentos
                            </div>
                            <div className="mt-1 text-2xl font-bold text-slate-900">
                                {resumen.total}
                            </div>
                        </div>

                        <div className="rounded-xl border border-purple-100 bg-purple-50/60 px-4 py-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                                Videos
                            </div>
                            <div className="mt-1 text-2xl font-bold text-purple-700">
                                {resumen.videos}
                            </div>
                        </div>

                        <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 px-4 py-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-cyan-600">
                                Con archivo
                            </div>
                            <div className="mt-1 text-2xl font-bold text-cyan-700">
                                {resumen.conArchivo}
                            </div>
                        </div>
                    </div>

                    <div className="p-5">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                            <div className={isCliente ? "lg:col-span-8" : "lg:col-span-6"}>
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar por título, problema, solución, categoría o empresa..."
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                />
                            </div>

                            {!isCliente && (
                                <div className="lg:col-span-3">
                                    <Select
                                        value={empresaFiltro}
                                        onChange={(value) => setEmpresaFiltro(value)}
                                        style={{ width: "100%" }}
                                        showSearch
                                        optionFilterProp="label"
                                        options={[
                                            { value: "todas", label: "Todas las empresas" },
                                            ...empresas.map((e) => ({
                                                value: String(e.id_empresa),
                                                label: e.nombre,
                                            })),
                                        ]}
                                    />
                                </div>
                            )}

                            <div className={isCliente ? "lg:col-span-4" : "lg:col-span-3"}>
                                <Select
                                    value={tipoFiltro}
                                    onChange={(value) => setTipoFiltro(value)}
                                    style={{ width: "100%" }}
                                    options={[
                                        { value: "todos", label: "Todos los tipos" },
                                        ...TIPO_OPTIONS,
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Listado */}
                <section
                    className="mt-5 grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4"
                    aria-live="polite"
                    aria-busy={loading ? "true" : "false"}
                >
                    {loading ? (
                        Array.from({ length: 6 }).map((_, index) => (
                            <div
                                key={`manual-card-skeleton-${index}`}
                                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                            >
                                <div className="h-4 w-40 rounded bg-slate-100 animate-pulse mb-3" />
                                <div className="h-3 w-full rounded bg-slate-100 animate-pulse mb-2" />
                                <div className="h-3 w-2/3 rounded bg-slate-100 animate-pulse" />
                            </div>
                        ))
                    ) : filtered.length === 0 ? (
                        <div className="xl:col-span-2 2xl:col-span-3 rounded-2xl border border-slate-100 bg-white p-10 text-center text-slate-400 shadow-sm">
                            <BookOutlined className="text-4xl mb-3" />
                            <div className="font-medium text-slate-600">Sin manuales encontrados</div>
                            <div className="text-sm mt-1">Prueba cambiando los filtros o creando un nuevo manual.</div>
                        </div>
                    ) : (
                        filtered.map((item) => (
                            <article
                                key={item.id}
                                className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-cyan-200 transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span
                                                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getTipoClass(item.tipo)}`}
                                            >
                                                {getTipoLabel(item.tipo)}
                                            </span>

                                            {item.categoria && (
                                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">
                                                    {item.categoria}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="font-bold text-slate-900 group-hover:text-cyan-700 transition-colors line-clamp-2">
                                            {item.titulo}
                                        </h3>

                                        {item.descripcion && (
                                            <p className="mt-2 text-sm text-slate-500 line-clamp-2">
                                                {item.descripcion}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {(item.problema || item.solucion) && (
                                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                        {item.problema && (
                                            <div className="text-xs text-slate-500">
                                                <span className="font-semibold text-slate-700">Problema:</span>{" "}
                                                <span className="line-clamp-1">{item.problema}</span>
                                            </div>
                                        )}

                                        {item.solucion && (
                                            <div className="text-xs text-slate-500 mt-1">
                                                <span className="font-semibold text-slate-700">Solución:</span>{" "}
                                                <span className="line-clamp-1">{item.solucion}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                    {!isCliente && (
                                        <span className="rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-0.5 text-cyan-700">
                                            {item.empresa?.nombre || "General"}
                                        </span>
                                    )}

                                    {!isCliente && (
                                        <span
                                            className={`rounded-full border px-2.5 py-0.5 ${item.visibleCliente
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                : "border-slate-200 bg-slate-50 text-slate-500"
                                                }`}
                                        >
                                            {item.visibleCliente ? "Visible cliente" : "Interno"}
                                        </span>
                                    )}

                                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-slate-500">
                                        Creado: {formatFecha(item.createdAt)}
                                    </span>

                                    <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-indigo-700">
                                        Actualizado: {formatFecha(item.updatedAt)}
                                    </span>

                                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-slate-500">
                                        {resourceCount(item)} recurso{resourceCount(item) !== 1 ? "s" : ""}
                                    </span>
                                </div>

                                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex flex-wrap gap-2">
                                        {((item.archivos?.length ?? 0) > 0 || item.urlArchivo) && (
                                            <div className="flex flex-wrap gap-2">
                                                {(item.archivos?.length
                                                    ? item.archivos
                                                    : item.urlArchivo
                                                        ? [{ nombreArchivo: "Archivo", urlArchivo: item.urlArchivo }]
                                                        : []
                                                ).map((archivo, index) => (
                                                    <a
                                                        key={`${archivo.urlArchivo}-${index}`}
                                                        href={archivo.urlArchivo}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-medium text-cyan-800 hover:bg-cyan-100"
                                                    >
                                                        <FileTextOutlined />
                                                        {archivo.nombreArchivo || `Archivo ${index + 1}`}
                                                    </a>
                                                ))}
                                            </div>
                                        )}

                                        {item.urlVideo && (
                                            <a
                                                href={item.urlVideo}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-medium text-purple-800 hover:bg-purple-100"
                                            >
                                                <VideoCameraOutlined />
                                                Video
                                            </a>
                                        )}

                                        {!(
                                            (Array.isArray(item.archivos) && item.archivos.length > 0) ||
                                            item.urlArchivo ||
                                            item.urlVideo
                                        ) && (
                                                <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400">
                                                    Sin recursos
                                                </span>
                                            )}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setViewing(item)}
                                            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-cyan-50 hover:text-cyan-700"
                                            title="Ver"
                                            type="button"
                                        >
                                            <EyeOutlined />
                                        </button>

                                        {!isCliente && (
                                            <>
                                                <button
                                                    onClick={() => startEdit(item)}
                                                    className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                                                    title="Editar"
                                                    type="button"
                                                >
                                                    <EditOutlined />
                                                </button>

                                                <button
                                                    onClick={() => disableItem(item)}
                                                    className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                                                    title="Desactivar"
                                                    type="button"
                                                >
                                                    <DeleteOutlined />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </section>
            </div>

            {/* Modal crear / editar */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 p-2 sm:p-4">
                    <div className="w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white border border-slate-200 shadow-xl">
                        <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-cyan-50">
                            <div>
                                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                                    {editing ? "Editar manual o tutorial" : "Nuevo manual o tutorial"}
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Completa la información para la base de conocimiento.
                                </p>
                            </div>

                            <button
                                onClick={closeModal}
                                disabled={saving}
                                className="text-slate-500 hover:text-slate-800"
                                type="button"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="text-sm md:col-span-2">
                                <span className="block mb-1 text-slate-700">
                                    Título <span className="text-rose-500">*</span>
                                </span>

                                <input
                                    value={form.titulo}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, titulo: e.target.value }))
                                    }
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                    placeholder="Ej: Configurar Outlook en equipo nuevo"
                                />
                            </label>

                            <label className="text-sm">
                                <span className="block mb-1 text-slate-700">
                                    Tipo <span className="text-rose-500">*</span>
                                </span>

                                <Select
                                    value={form.tipo || undefined}
                                    onChange={(value) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            tipo: value as TipoManualTutorial,
                                        }))
                                    }
                                    placeholder="Selecciona un tipo"
                                    style={{ width: "100%" }}
                                    options={TIPO_OPTIONS}
                                />
                            </label>

                            <label className="text-sm">
                                <span className="block mb-1 text-slate-700">
                                    Categoría <span className="text-rose-500">*</span>
                                </span>

                                <Select
                                    value={form.categoria || undefined}
                                    onChange={(value) =>
                                        setForm((prev) => ({ ...prev, categoria: value }))
                                    }
                                    placeholder="Selecciona una categoría"
                                    style={{ width: "100%" }}
                                    showSearch
                                    optionFilterProp="label"
                                    options={CATEGORIA_OPTIONS}
                                />
                            </label>

                            {!isCliente && (
                                <label className="text-sm md:col-span-2">
                                    <span className="block mb-1 text-slate-700">
                                        Empresa <span className="text-rose-500">*</span>
                                    </span>

                                    <Select
                                        value={form.empresaId || undefined}
                                        onChange={(value) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                empresaId: value,
                                            }))
                                        }
                                        placeholder="Selecciona una empresa"
                                        style={{ width: "100%" }}
                                        showSearch
                                        optionFilterProp="label"
                                        options={empresas.map((empresa) => ({
                                            value: String(empresa.id_empresa),
                                            label: empresa.nombre,
                                        }))}
                                    />
                                </label>
                            )}

                            <label className="text-sm md:col-span-2">
                                <span className="block mb-1 text-slate-700">Descripción</span>

                                <textarea
                                    value={form.descripcion}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            descripcion: e.target.value,
                                        }))
                                    }
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                    rows={2}
                                />
                            </label>

                            <label className="text-sm md:col-span-2">
                                <span className="block mb-1 text-slate-700">
                                    Problema <span className="text-rose-500">*</span>
                                </span>

                                <textarea
                                    value={form.problema}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, problema: e.target.value }))
                                    }
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                    rows={3}
                                    placeholder="Describe el problema frecuente..."
                                />
                            </label>

                            <label className="text-sm md:col-span-2">
                                <span className="block mb-1 text-slate-700">
                                    Solución <span className="text-rose-500">*</span>
                                </span>

                                <textarea
                                    value={form.solucion}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, solucion: e.target.value }))
                                    }
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                    rows={5}
                                    placeholder="Describe los pasos de solución..."
                                />
                            </label>

                            <div className="text-sm">
                                <span className="block mb-1 text-slate-700">Archivo manual</span>

                                <div className="text-sm md:col-span-2">
                                    <span className="block mb-1 text-slate-700">
                                        Archivos adjuntos
                                    </span>

                                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                                        <input
                                            type="file"
                                            multiple
                                           accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.txt,.mp4,.mov,.webm,.mkv"
                                            disabled={uploadingFile}
                                            onChange={(e) => {
                                                const files = e.target.files;

                                                if (!files || files.length === 0) return;

                                                void uploadArchivosManual(files);

                                                e.currentTarget.value = "";
                                            }}
                                            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-cyan-800 hover:file:bg-cyan-100"
                                        />

                                        {uploadingFile && (
                                            <p className="mt-2 text-xs text-cyan-700">
                                                Subiendo archivos...
                                            </p>
                                        )}

                                        {form.archivos.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {form.archivos.map((archivo, index) => (
                                                    <div
                                                        key={`${archivo.urlArchivo}-${index}`}
                                                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                                                    >
                                                        <a
                                                            href={archivo.urlArchivo}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="min-w-0 truncate text-xs font-medium text-cyan-700 hover:underline"
                                                        >
                                                            {archivo.nombreArchivo || `Archivo ${index + 1}`}
                                                        </a>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setForm((prev) => ({
                                                                    ...prev,
                                                                    archivos: prev.archivos.filter((_, i) => i !== index),
                                                                }))
                                                            }
                                                            className="shrink-0 rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                                                        >
                                                            Quitar
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {form.archivos.length === 0 && !uploadingFile && (
                                            <p className="mt-2 text-xs text-slate-400">
                                                Puedes seleccionar uno o varios archivos.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3">
                                    <span className="block mb-1 text-slate-500 text-xs">
                                        O pega URL del archivo manualmente
                                    </span>

                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input
                                            id="manual-url-archivo"
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                            placeholder="https://..."
                                        />

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const input = document.getElementById(
                                                    "manual-url-archivo"
                                                ) as HTMLInputElement | null;

                                                const url = input?.value.trim() ?? "";

                                                if (!url) {
                                                    setToast({
                                                        type: "error",
                                                        message: "Debes ingresar una URL de archivo",
                                                    });
                                                    return;
                                                }

                                                setForm((prev) => ({
                                                    ...prev,
                                                    archivos: [
                                                        ...prev.archivos,
                                                        {
                                                            nombreArchivo: `Archivo ${prev.archivos.length + 1}`,
                                                            urlArchivo: url,
                                                        },
                                                    ],
                                                }));

                                                if (input) input.value = "";
                                            }}
                                            className="shrink-0 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-800 hover:bg-cyan-100"
                                        >
                                            Agregar URL
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <label className="text-sm">
                                <span className="block mb-1 text-slate-700">URL video</span>

                                <input
                                    value={form.urlVideo}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            urlVideo: e.target.value,
                                        }))
                                    }
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                    placeholder="https://..."
                                />
                            </label>

                            <label className="text-sm">
                                <span className="block mb-1 text-slate-700">
                                    Plataforma <span className="text-rose-500">*</span>
                                </span>

                                <Select
                                    value={form.plataforma || undefined}
                                    onChange={(value) =>
                                        setForm((prev) => ({ ...prev, plataforma: value }))
                                    }
                                    placeholder="Selecciona una plataforma"
                                    style={{ width: "100%" }}
                                    showSearch
                                    optionFilterProp="label"
                                    options={PLATAFORMA_OPTIONS}
                                />
                            </label>

                            {!isCliente && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Switch
                                        checked={form.visibleCliente}
                                        onChange={(checked) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                visibleCliente: checked,
                                            }))
                                        }
                                    />
                                    <span>Visible para cliente</span>
                                </div>
                            )}
                        </div>

                        <div className="px-4 sm:px-5 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3 bg-slate-50">
                            <button
                                onClick={closeModal}
                                disabled={saving}
                                className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                type="button"
                            >
                                Cancelar
                            </button>

                            <button
                                onClick={save}
                                disabled={saving || uploadingFile}
                                className="w-full sm:w-auto rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                                type="button"
                            >
                                {uploadingFile ? "Subiendo archivo..." : saving ? "Guardando..." : "Guardar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal ver */}
            {viewing && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 p-2 sm:p-4">
                    <div className="w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white border border-slate-200 shadow-xl">
                        <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-cyan-50">
                            <div className="min-w-0">
                                <h2 className="text-base sm:text-lg font-bold text-slate-900 break-words">
                                    {viewing.titulo}
                                </h2>
                                <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                                    <span>Creado: {formatFecha(viewing.createdAt)}</span>
                                    <span>Actualizado: {formatFecha(viewing.updatedAt)}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setViewing(null)}
                                className="text-slate-500 hover:text-slate-800 shrink-0"
                                type="button"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-4 sm:p-5 space-y-5 text-sm text-slate-700">
                            <div className="flex flex-wrap gap-2">
                                <span
                                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getTipoClass(viewing.tipo)}`}
                                >
                                    {getTipoLabel(viewing.tipo)}
                                </span>

                                {viewing.categoria && (
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs">
                                        {viewing.categoria}
                                    </span>
                                )}

                                {viewing.empresa?.nombre && (
                                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-xs text-cyan-700">
                                        {viewing.empresa.nombre}
                                    </span>
                                )}

                                {!isCliente && (
                                    <span
                                        className={`rounded-full border px-2.5 py-0.5 text-xs ${viewing.visibleCliente
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                            : "border-slate-200 bg-slate-50 text-slate-500"
                                            }`}
                                    >
                                        {viewing.visibleCliente ? "Visible cliente" : "Interno"}
                                    </span>
                                )}
                            </div>

                            {viewing.descripcion && (
                                <section>
                                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">
                                        Descripción
                                    </h3>
                                    <p className="whitespace-pre-wrap text-slate-700">
                                        {viewing.descripcion}
                                    </p>
                                </section>
                            )}

                            {viewing.problema && (
                                <section className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-1">
                                        Problema
                                    </h3>
                                    <p className="whitespace-pre-wrap text-slate-700">
                                        {viewing.problema}
                                    </p>
                                </section>
                            )}

                            {viewing.solucion && (
                                <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-1">
                                        Solución
                                    </h3>
                                    <p className="whitespace-pre-wrap text-slate-700">
                                        {viewing.solucion}
                                    </p>
                                </section>
                            )}

                            {(
                                (Array.isArray(viewing.archivos) && viewing.archivos.length > 0) ||
                                viewing.urlArchivo ||
                                viewing.urlVideo ||
                                viewing.plataforma
                            ) && (
                                    <section>
                                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">
                                            Recursos
                                        </h3>

                                        <div className="flex flex-wrap gap-2">
                                            {(viewing.archivos?.length
                                                ? viewing.archivos
                                                : viewing.urlArchivo
                                                    ? [{ nombreArchivo: "Archivo", urlArchivo: viewing.urlArchivo }]
                                                    : []
                                            ).map((archivo, index) => (
                                                <a
                                                    key={`${archivo.urlArchivo}-${index}`}
                                                    href={archivo.urlArchivo}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-800 hover:bg-cyan-100"
                                                >
                                                    <FileTextOutlined />
                                                    {archivo.nombreArchivo || `Archivo ${index + 1}`}
                                                </a>
                                            ))}

                                            {viewing.urlVideo && (
                                                <a
                                                    href={viewing.urlVideo}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-800 hover:bg-purple-100"
                                                >
                                                    <VideoCameraOutlined />
                                                    Abrir video
                                                </a>
                                            )}

                                            {viewing.plataforma && (
                                                <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                                                    Plataforma: {viewing.plataforma}
                                                </span>
                                            )}
                                        </div>
                                    </section>
                                )}
                        </div>

                        <div className="px-4 sm:px-5 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3 bg-slate-50">
                            <button
                                onClick={() => setViewing(null)}
                                className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                type="button"
                            >
                                Cerrar
                            </button>

                            {!isCliente && (
                                <button
                                    onClick={() => {
                                        const item = viewing;
                                        setViewing(null);
                                        startEdit(item);
                                    }}
                                    className="w-full sm:w-auto rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                    type="button"
                                >
                                    Editar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div
                    className={`fixed top-5 left-3 right-3 sm:left-auto sm:right-5 z-[9999] rounded-xl px-4 py-3 text-sm text-white shadow-lg ${toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
                        }`}
                >
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default ManualesTutorialesPage;