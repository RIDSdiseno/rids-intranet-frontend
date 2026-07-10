// src/components/modals-cotizaciones/cotizaciones-masivas/CotizacionesMasivasManager.tsx

import React, { useState } from "react";
import { FileTextOutlined, CloseCircleOutlined } from "@ant-design/icons";
import CotizacionMasivaModal from "./CotizacionMasivaModal";
import PlantillasMasivasModal from "./plantillasMasivasModal";
import PreviewPlantillaMasivaModal from "./PreviewPlantillaMasivaModal";
import type { EntidadGestioo } from "../types";

type ModoCotizacionMasiva = "generar" | "plantilla" | "editar";

type Props = {
    show: boolean;
    onClose: () => void;
    entidades: EntidadGestioo[];
    productos: any[];
    apiFetch: any;
    fetchCatalogo: () => Promise<void>;
    fetchEntidades: () => Promise<void>;
    onReloadCotizaciones: () => Promise<void>;
    showSuccess: (message: string) => void;
    handleApiError: (error: any, defaultMessage: string) => void;
};

export default function CotizacionesMasivasManager({
    show,
    onClose,
    entidades,
    productos,
    apiFetch,
    fetchCatalogo,
    fetchEntidades,
    onReloadCotizaciones,
    showSuccess,
    handleApiError,
}: Props) {
    const [showCotizacionMasivaModal, setShowCotizacionMasivaModal] = useState(false);
    const [loadingCotizacionesMasivas, setLoadingCotizacionesMasivas] = useState(false);

    const [modoCotizacionMasiva, setModoCotizacionMasiva] =
        useState<ModoCotizacionMasiva>("generar");

    const [plantillaEditando, setPlantillaEditando] = useState<any | null>(null);

    const [plantillasMasivas, setPlantillasMasivas] = useState<any[]>([]);
    const [showPlantillasMasivas, setShowPlantillasMasivas] = useState(false);
    const [loadingPlantillasMasivas, setLoadingPlantillasMasivas] = useState(false);
    const [generandoPlantillaId, setGenerandoPlantillaId] = useState<number | null>(null);

    const [plantillaPreview, setPlantillaPreview] = useState<any | null>(null);
    const [showPreviewPlantilla, setShowPreviewPlantilla] = useState(false);

    if (!show) return null;

    const abrirCotizacionesMasivas = async (
        modo: ModoCotizacionMasiva = "generar"
    ) => {
        try {
            setModoCotizacionMasiva(modo);
            setPlantillaEditando(null);

            await fetchCatalogo();
            await fetchEntidades();

            setShowCotizacionMasivaModal(true);
        } catch (error) {
            handleApiError(error, "Error al cargar datos para cotizaciones masivas");
        }
    };

    const handleCrearCotizacionesMasivas = async (payload: {
        nombreGrupo?: string;
        comentariosCotizacion: string;
        cotizaciones: Array<{
            entidadId: number;
            comentariosCotizacion?: string;
            items: Array<{
                productoId: number;
                cantidad: number;
            }>;
        }>;
    }) => {
        try {
            setLoadingCotizacionesMasivas(true);

            const resp = await apiFetch("/cotizaciones-masivas/generar-directo", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const generadas = resp?.data ?? [];

            setShowCotizacionMasivaModal(false);

            await onReloadCotizaciones();

            showSuccess(
                `${generadas.length || payload.cotizaciones.length} cotización(es) generada(s) correctamente`
            );
        } catch (error) {
            handleApiError(error, "Error al crear cotizaciones masivas");
        } finally {
            setLoadingCotizacionesMasivas(false);
        }
    };

    const handleGuardarPlantillaMasiva = async (payload: {
        nombre: string;
        descripcion?: string;
        items?: Array<{ productoId: number }>;
        productos?: Array<{ productoId: number }>;
        entidades: Array<{
            entidadId: number;
            cantidades: Array<{
                productoId: number;
                cantidad: number;
            }>;
        }>;
    }) => {
        try {
            setLoadingCotizacionesMasivas(true);

            const resp = await apiFetch("/cotizaciones-masivas", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    nombre: payload.nombre,
                    descripcion: payload.descripcion,
                    productos: payload.productos ?? payload.items ?? [],
                    entidades: payload.entidades,
                }),
            });

            setShowCotizacionMasivaModal(false);

            showSuccess(resp?.message || "Plantilla masiva guardada correctamente");
            await cargarPlantillasMasivas();
        } catch (error) {
            handleApiError(error, "Error al guardar plantilla masiva");
        } finally {
            setLoadingCotizacionesMasivas(false);
        }
    };

    const cargarPlantillasMasivas = async () => {
        try {
            setLoadingPlantillasMasivas(true);

            const resp = await apiFetch("/cotizaciones-masivas");
            const data = resp?.data ?? resp?.items ?? resp ?? [];

            setPlantillasMasivas(Array.isArray(data) ? data : []);
            setShowPlantillasMasivas(true);
        } catch (error) {
            handleApiError(error, "Error al cargar plantillas masivas");
        } finally {
            setLoadingPlantillasMasivas(false);
        }
    };

    const handleGenerarDesdePlantilla = async (plantillaId: number) => {
        const confirmar = window.confirm(
            "¿Deseas generar cotizaciones desde esta plantilla?"
        );

        if (!confirmar) return;

        try {
            setGenerandoPlantillaId(plantillaId);

            const fecha = new Date().toLocaleDateString("es-CL");

            const resp = await apiFetch(`/cotizaciones-masivas/${plantillaId}/generar`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    nombreEjecucion: `Generación ${fecha}`,
                    comentariosCotizacion: `Cotización generada desde plantilla masiva el ${fecha}.`,
                }),
            });

            await onReloadCotizaciones();
            await cargarPlantillasMasivas();

            const total =
                resp?.data?.totalCotizaciones ??
                resp?.totalCotizaciones ??
                resp?.cotizaciones?.length ??
                0;

            showSuccess(
                total > 0
                    ? `${total} cotización(es) generada(s) desde la plantilla`
                    : "Cotizaciones generadas desde la plantilla"
            );
        } catch (error) {
            handleApiError(error, "Error al generar cotizaciones desde la plantilla");
        } finally {
            setGenerandoPlantillaId(null);
        }
    };

    const handleDesactivarPlantillaMasiva = async (plantillaId: number) => {
        const confirmar = window.confirm(
            "¿Seguro que deseas desactivar esta plantilla?"
        );

        if (!confirmar) return;

        try {
            await apiFetch(`/cotizaciones-masivas/${plantillaId}`, {
                method: "DELETE",
            });

            setPlantillasMasivas(prev =>
                prev.filter((plantilla) => plantilla.id !== plantillaId)
            );

            showSuccess("Plantilla desactivada correctamente");
        } catch (error) {
            handleApiError(error, "Error al desactivar plantilla masiva");
        }
    };

    const handleAbrirEditarPlantillaMasiva = async (plantilla: any) => {
        try {
            setPlantillaEditando(plantilla);
            setModoCotizacionMasiva("editar");

            await fetchCatalogo();
            await fetchEntidades();

            setShowPlantillasMasivas(false);
            setShowCotizacionMasivaModal(true);
        } catch (error) {
            handleApiError(error, "Error al abrir plantilla para editar");
        }
    };

    const handleActualizarPlantillaMasiva = async (payload: {
        nombre: string;
        descripcion?: string;
        items?: Array<{ productoId: number }>;
        productos?: Array<{ productoId: number }>;
        entidades: Array<{
            entidadId: number;
            cantidades: Array<{
                productoId: number;
                cantidad: number;
            }>;
        }>;
    }) => {
        if (!plantillaEditando) return;

        try {
            setLoadingCotizacionesMasivas(true);

            const resp = await apiFetch(`/cotizaciones-masivas/${plantillaEditando.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    nombre: payload.nombre,
                    descripcion: payload.descripcion,
                    productos: payload.productos ?? payload.items ?? [],
                    entidades: payload.entidades,
                }),
            });

            setShowCotizacionMasivaModal(false);
            setPlantillaEditando(null);

            await cargarPlantillasMasivas();

            showSuccess(resp?.message || "Plantilla actualizada correctamente");
        } catch (error) {
            handleApiError(error, "Error al actualizar plantilla masiva");
        } finally {
            setLoadingCotizacionesMasivas(false);
        }
    };

    const handlePreviewPlantillaMasiva = (plantilla: any) => {
        setPlantillaPreview(plantilla);
        setShowPreviewPlantilla(true);
    };

    const mostrarMenuPrincipal =
        show &&
        !showCotizacionMasivaModal &&
        !showPlantillasMasivas &&
        !showPreviewPlantilla;

    return (
        <>
            {mostrarMenuPrincipal && (
                <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/40 px-3 py-4 sm:px-4 sm:py-6">
                    {/*
            Modal principal de opciones:
            - w-full permite ocupar el ancho disponible en móvil.
            - max-w-3xl limita el ancho en pantallas grandes.
            - max-h evita que se salga de la pantalla.
            - overflow-hidden mantiene bordes redondeados aunque el contenido tenga scroll.
        */}
                    <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
                            <div className="min-w-0">
                                <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                                    Cotizaciones masivas
                                </h2>

                                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                                    Genera cotizaciones masivas o administra plantillas reutilizables.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Cerrar opciones de cotizaciones masivas"
                                className="shrink-0 rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                            >
                                <CloseCircleOutlined />
                            </button>
                        </div>

                        {/*
                Contenido responsive:
                - En móvil las opciones se muestran en 1 columna.
                - En pantallas medianas/grandes se muestran en 3 columnas.
                - overflow-y-auto permite scroll si la pantalla es baja.
            */}
                        <div className="overflow-y-auto px-4 py-5 sm:px-6 md:grid md:grid-cols-3 md:gap-4">
                            {/* Botón para generar cotizaciones sin guardar plantilla */}
                            <button
                                type="button"
                                onClick={() => abrirCotizacionesMasivas("generar")}
                                className="mb-3 w-full rounded-2xl border border-purple-200 px-5 py-4 text-left transition hover:bg-purple-50 md:mb-0"
                            >
                                <FileTextOutlined className="mb-3 text-2xl text-purple-600" />

                                <div className="font-bold text-slate-800">
                                    Generar ahora
                                </div>

                                <p className="mt-1 text-sm text-slate-500">
                                    Crea cotizaciones masivas sin guardar plantilla.
                                </p>
                            </button>

                            {/* Botón para crear una nueva plantilla reutilizable */}
                            <button
                                type="button"
                                onClick={() => abrirCotizacionesMasivas("plantilla")}
                                className="mb-3 w-full rounded-2xl border border-emerald-200 px-5 py-4 text-left transition hover:bg-emerald-50 md:mb-0"
                            >
                                <FileTextOutlined className="mb-3 text-2xl text-emerald-600" />

                                <div className="font-bold text-slate-800">
                                    Nueva plantilla
                                </div>

                                <p className="mt-1 text-sm text-slate-500">
                                    Guarda una configuración reutilizable.
                                </p>
                            </button>

                            {/* Botón para abrir el listado de plantillas */}
                            <button
                                type="button"
                                onClick={cargarPlantillasMasivas}
                                className="w-full rounded-2xl border border-indigo-200 px-5 py-4 text-left transition hover:bg-indigo-50"
                            >
                                <FileTextOutlined className="mb-3 text-2xl text-indigo-600" />

                                <div className="font-bold text-slate-800">
                                    Ver plantillas
                                </div>

                                <p className="mt-1 text-sm text-slate-500">
                                    Genera, edita o revisa plantillas guardadas.
                                </p>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CotizacionMasivaModal
                show={showCotizacionMasivaModal}
                onClose={() => {
                    setShowCotizacionMasivaModal(false);
                    setPlantillaEditando(null);
                    setModoCotizacionMasiva("generar");
                }}
                entidades={entidades}
                productos={productos}
                modo={modoCotizacionMasiva}
                plantillaInicial={plantillaEditando}
                onGenerar={handleCrearCotizacionesMasivas}
                onGuardarPlantilla={handleGuardarPlantillaMasiva}
                onActualizarPlantilla={handleActualizarPlantillaMasiva}
                apiLoading={loadingCotizacionesMasivas}
            />

            <PlantillasMasivasModal
                show={showPlantillasMasivas}
                onClose={() => setShowPlantillasMasivas(false)}
                plantillas={plantillasMasivas}
                loading={loadingPlantillasMasivas}
                generandoPlantillaId={generandoPlantillaId}
                onPreview={handlePreviewPlantillaMasiva}
                onGenerar={handleGenerarDesdePlantilla}
                onEditar={handleAbrirEditarPlantillaMasiva}
                onDesactivar={handleDesactivarPlantillaMasiva}
            />

            <PreviewPlantillaMasivaModal
                show={showPreviewPlantilla}
                plantilla={plantillaPreview}
                onClose={() => {
                    setShowPreviewPlantilla(false);
                    setPlantillaPreview(null);
                }}
                onGenerar={(id) => {
                    setShowPreviewPlantilla(false);
                    setPlantillaPreview(null);
                    handleGenerarDesdePlantilla(id);
                }}
            />
        </>
    );
}