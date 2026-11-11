// src/components/modals-funnel/DocumentosOportunidad.tsx
//
// Sección «Documentos» del detalle de la oportunidad: PDF adjuntos
// (propuesta, bases, orden de compra…). Carga y gestiona su propia lista,
// así no hay que tocar el hook useOportunidadesFunnel.

import { useCallback, useEffect, useState } from "react";
import { App, Input, Select, Tag, Tooltip, Upload } from "antd";
import {
    DeleteOutlined,
    DownloadOutlined,
    EyeOutlined,
    FilePdfOutlined,
    InboxOutlined,
    UploadOutlined,
} from "@ant-design/icons";

import { http } from "../../service/http";
import type {
    ApiEnvelope,
    DocumentoOportunidadUrl,
    OportunidadDocumentoItem,
    TipoDocumentoOportunidad,
} from "./types";
import { formatFechaHora, getOportunidadErrorMessage } from "./utils";

/* Mismo límite que el backend (MAX_BYTES_DOCUMENTO) */
const MAX_BYTES = 15 * 1024 * 1024;

const TIPOS_DOCUMENTO: { value: TipoDocumentoOportunidad; label: string; color: string }[] = [
    { value: "PROPUESTA", label: "Propuesta", color: "cyan" },
    { value: "BASES", label: "Bases / requerimientos", color: "purple" },
    { value: "ORDEN_COMPRA", label: "Orden de compra", color: "green" },
    { value: "CONTRATO", label: "Contrato", color: "blue" },
    { value: "OTRO", label: "Otro", color: "default" },
];

const tipoInfo = (tipo: TipoDocumentoOportunidad) =>
    TIPOS_DOCUMENTO.find((t) => t.value === tipo) ?? TIPOS_DOCUMENTO[TIPOS_DOCUMENTO.length - 1]!;

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface DocumentosOportunidadProps {
    oportunidadId: number;
    /** Si la oportunidad está inactiva, solo se consultan los documentos. */
    activo: boolean;
}

export default function DocumentosOportunidad({ oportunidadId, activo }: DocumentosOportunidadProps) {
    const { notification, modal } = App.useApp();

    const [documentos, setDocumentos] = useState<OportunidadDocumentoItem[]>([]);
    const [cargando, setCargando] = useState(false);

    const [tipo, setTipo] = useState<TipoDocumentoOportunidad>("PROPUESTA");
    const [descripcion, setDescripcion] = useState("");
    const [subiendo, setSubiendo] = useState(false);
    const [abriendoId, setAbriendoId] = useState<number | null>(null);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const res = await http.get<ApiEnvelope<OportunidadDocumentoItem[]>>(
                `/oportunidades/${oportunidadId}/documentos`
            );
            setDocumentos(res.data.data ?? []);
        } catch (err) {
            notification.error({
                message: "No se pudieron cargar los documentos",
                description: getOportunidadErrorMessage(err, "Ocurrió un error inesperado."),
            });
        } finally {
            setCargando(false);
        }
        // notification fuera de las dependencias: solo se recarga al cambiar de oportunidad
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [oportunidadId]);

    useEffect(() => {
        setDescripcion("");
        setTipo("PROPUESTA");
        void cargar();
    }, [cargar]);

    /* ---------- Elegir archivo: se valida y se sube de inmediato ---------- */

    function elegirArchivo(file: File) {
        const esPdf =
            file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

        if (!esPdf) {
            notification.warning({ message: "Solo se permiten archivos PDF." });
            return Upload.LIST_IGNORE;
        }

        if (file.size > MAX_BYTES) {
            notification.warning({
                message: "El PDF es demasiado grande",
                description: `El máximo es ${MAX_BYTES / 1024 / 1024} MB.`,
            });
            return Upload.LIST_IGNORE;
        }

        /*
         * Se sube apenas se elige: no queda un archivo «seleccionado» en el estado
         * que se pierda si el detalle se recarga mientras el selector está abierto.
         */
        void subir(file);

        /* false = antd no sube por su cuenta */
        return false;
    }

    /* ---------- Subir ---------- */

    async function subir(archivo: File) {
        if (subiendo) return;

        const form = new FormData();
        form.append("archivo", archivo);
        form.append("tipo", tipo);
        if (descripcion.trim()) form.append("descripcion", descripcion.trim());

        setSubiendo(true);
        try {
            await http.post(`/oportunidades/${oportunidadId}/documentos`, form, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            notification.success({ message: "Documento adjuntado", description: archivo.name });

            setDescripcion("");
            await cargar();
        } catch (err) {
            notification.error({
                message: "No se pudo subir el PDF",
                description: getOportunidadErrorMessage(err, "Ocurrió un error inesperado."),
            });
        } finally {
            setSubiendo(false);
        }
    }

    /* ---------- Ver / descargar (URL firmada de 10 min) ---------- */

    async function abrir(documento: OportunidadDocumentoItem, descargar: boolean) {
        /*
         * La pestaña se abre antes del await: si se abre después,
         * el navegador la trata como popup y la bloquea.
         */
        const ventana = descargar ? null : window.open("", "_blank");

        setAbriendoId(documento.id);
        try {
            const res = await http.get<ApiEnvelope<DocumentoOportunidadUrl>>(
                `/oportunidades/${oportunidadId}/documentos/${documento.id}`,
                { params: descargar ? { descargar: 1 } : {} }
            );

            const { url } = res.data.data;

            if (descargar) {
                const link = document.createElement("a");
                link.href = url;
                link.rel = "noopener";
                document.body.appendChild(link);
                link.click();
                link.remove();
            } else if (ventana) {
                ventana.location.href = url;
            } else {
                window.open(url, "_blank", "noopener");
            }
        } catch (err) {
            ventana?.close();
            notification.error({
                message: "No se pudo abrir el documento",
                description: getOportunidadErrorMessage(err, "Ocurrió un error inesperado."),
            });
        } finally {
            setAbriendoId(null);
        }
    }

    /* ---------- Eliminar ---------- */

    function eliminar(documento: OportunidadDocumentoItem) {
        modal.confirm({
            title: "Eliminar documento",
            content: `¿Confirmas eliminar «${documento.nombre}»? El archivo se borra definitivamente.`,
            okText: "Eliminar",
            cancelText: "Cancelar",
            okButtonProps: { danger: true },
            onOk: async () => {
                try {
                    await http.delete(`/oportunidades/${oportunidadId}/documentos/${documento.id}`);
                    notification.success({ message: "Documento eliminado" });
                    await cargar();
                } catch (err) {
                    notification.error({
                        message: "No se pudo eliminar el documento",
                        description: getOportunidadErrorMessage(err, "Ocurrió un error inesperado."),
                    });
                    throw err;
                }
            },
        });
    }

    return (
        <section>
            <h4 className="mb-2 text-sm font-semibold text-slate-700">
                Documentos ({documentos.length})
            </h4>

            {activo && (
                <div className="mb-3 rounded-xl border border-slate-200 p-3">
                    <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">Tipo</label>
                            <Select
                                className="w-full"
                                value={tipo}
                                onChange={setTipo}
                                disabled={subiendo}
                                options={TIPOS_DOCUMENTO.map((t) => ({ value: t.value, label: t.label }))}
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                                Descripción (opcional)
                            </label>
                            <Input
                                maxLength={500}
                                value={descripcion}
                                disabled={subiendo}
                                onChange={(e) => setDescripcion(e.target.value)}
                                placeholder="Ej: Propuesta técnica v2 enviada al cliente"
                            />
                        </div>
                    </div>

                    <Upload.Dragger
                        accept=".pdf,application/pdf"
                        multiple={false}
                        showUploadList={false}
                        beforeUpload={elegirArchivo}
                        disabled={subiendo}
                    >
                        <p className="ant-upload-drag-icon">
                            {subiendo ? <UploadOutlined /> : <InboxOutlined />}
                        </p>
                        <p className="text-sm text-slate-600">
                            {subiendo
                                ? "Subiendo PDF…"
                                : "Elige el tipo y luego arrastra un PDF aquí o haz clic para seleccionarlo"}
                        </p>
                        <p className="text-xs text-slate-400">
                            Se adjunta al seleccionarlo. Máximo {MAX_BYTES / 1024 / 1024} MB.
                        </p>
                    </Upload.Dragger>
                </div>
            )}

            <div className="space-y-2">
                {cargando && documentos.length === 0 ? (
                    <p className="text-sm text-slate-400">Cargando documentos…</p>
                ) : documentos.length === 0 ? (
                    <p className="text-sm text-slate-400">Sin documentos adjuntos.</p>
                ) : (
                    documentos.map((d) => {
                        const info = tipoInfo(d.tipo);
                        const ocupado = abriendoId === d.id;

                        return (
                            <div
                                key={d.id}
                                className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm"
                            >
                                <div className="flex min-w-0 flex-1 items-start gap-2">
                                    <FilePdfOutlined className="mt-0.5 text-lg text-rose-500" />

                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="truncate font-medium text-slate-700" title={d.nombre}>
                                                {d.nombre}
                                            </span>
                                            <Tag color={info.color} className="m-0">
                                                {info.label}
                                            </Tag>
                                        </div>

                                        {d.descripcion && (
                                            <div className="mt-0.5 text-xs text-slate-600">{d.descripcion}</div>
                                        )}

                                        <div className="mt-0.5 text-xs text-slate-400">
                                            {formatBytes(d.bytes)}
                                            {" · "}
                                            {d.subidoPor?.nombre ?? "—"}
                                            {" · "}
                                            {formatFechaHora(d.createdAt)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <Tooltip title="Ver en otra pestaña">
                                        <button
                                            type="button"
                                            disabled={ocupado}
                                            onClick={() => void abrir(d, false)}
                                            className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                                        >
                                            <EyeOutlined /> Ver
                                        </button>
                                    </Tooltip>

                                    <Tooltip title="Descargar">
                                        <button
                                            type="button"
                                            disabled={ocupado}
                                            onClick={() => void abrir(d, true)}
                                            className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                                        >
                                            <DownloadOutlined />
                                        </button>
                                    </Tooltip>

                                    {activo && (
                                        <Tooltip title="Eliminar">
                                            <button
                                                type="button"
                                                onClick={() => eliminar(d)}
                                                className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100"
                                            >
                                                <DeleteOutlined />
                                            </button>
                                        </Tooltip>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </section>
    );
}