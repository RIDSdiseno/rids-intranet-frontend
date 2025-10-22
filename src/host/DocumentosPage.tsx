import React, { useEffect, useMemo, useState } from "react";
import { getGraph } from "../lib/graph";

/* ========= Env ========= */
const SITE_HOSTNAME = import.meta.env.VITE_SP_SITE_HOSTNAME as string;
const SITE_PATH     = import.meta.env.VITE_SP_SITE_PATH as string;
const FOLDER_PATH   = import.meta.env.VITE_SP_FOLDER_PATH as string;

/* ========= Tipos mínimos de Graph ========= */
type DriveItem = {
  id: string;
  name: string;
  size?: number;
  webUrl?: string;
  lastModifiedDateTime?: string;
  file?: { mimeType?: string };
  folder?: { childCount?: number };
};

type GraphSite = { id: string };

type GraphListResponse<T> = { value: T[] };

type FolderNode = { id: string; name: string };

/* ========= Utils ========= */
const toHumanSize = (bytes?: number) =>
  typeof bytes === "number" ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : "-";

const toLocal = (iso?: string) =>
  iso ? new Date(iso).toLocaleString() : "-";

/* ========================================================================= */

export default function DocumentosPage() {
  const [items, setItems]         = useState<DriveItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Breadcrumb desde la carpeta base FOLDER_PATH (resuelta a un id)
  const [siteId, setSiteId]       = useState<string | null>(null);
  const [baseFolder, setBaseFolder] = useState<FolderNode | null>(null);
  const [trail, setTrail]         = useState<FolderNode[]>([]); // incluye baseFolder como primer elemento

  const currentFolder = useMemo(() => trail[trail.length - 1] ?? null, [trail]);

  /* ======= Cargar sitio, carpeta base y sus hijos ======= */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const client = await getGraph();

        // 1) Resolver sitio
        const site = await client
          .api(`/sites/${SITE_HOSTNAME}:/${SITE_PATH}`)
          .get() as GraphSite;

        if (cancelled) return;
        setSiteId(site.id);

        // 2) Resolver carpeta base por ruta (FOLDER_PATH) a un item (id)
        const folderItem = await client
          .api(`/sites/${site.id}/drive/root:/${encodeURIComponent(FOLDER_PATH)}`)
          .select("id,name,webUrl")
          .get() as DriveItem;

        if (cancelled) return;
        const base: FolderNode = { id: folderItem.id, name: folderItem.name };
        setBaseFolder(base);
        setTrail([base]); // arrancamos breadcrumb en la base

        // 3) Cargar hijos de esa carpeta
        const res = await client
          .api(`/sites/${site.id}/drive/items/${folderItem.id}/children`)
          .select("id,name,size,lastModifiedDateTime,webUrl,file,folder")
          .orderby("lastModifiedDateTime desc")
          .get() as GraphListResponse<DriveItem>;

        if (!cancelled) setItems(res.value ?? []);
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message :
          typeof e === "string" ? e :
          "Error al listar documentos";
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ======= Navegación a subcarpetas ======= */
  const openFolder = async (folder: FolderNode) => {
    if (!siteId) return;
    setLoading(true);
    setError(null);
    try {
      const client = await getGraph();
      const res = await client
        .api(`/sites/${siteId}/drive/items/${folder.id}/children`)
        .select("id,name,size,lastModifiedDateTime,webUrl,file,folder")
        .orderby("lastModifiedDateTime desc")
        .get() as GraphListResponse<DriveItem>;
      setItems(res.value ?? []);
      setTrail(prev => [...prev, folder]);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message :
        typeof e === "string" ? e :
        "Error al abrir la carpeta";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /* ======= Volver a una carpeta del breadcrumb ======= */
  const goToTrailIndex = async (index: number) => {
    if (!siteId) return;
    const target = trail[index];
    if (!target) return;

    setLoading(true);
    setError(null);
    try {
      const client = await getGraph();
      const res = await client
        .api(`/sites/${siteId}/drive/items/${target.id}/children`)
        .select("id,name,size,lastModifiedDateTime,webUrl,file,folder")
        .orderby("lastModifiedDateTime desc")
        .get() as GraphListResponse<DriveItem>;
      setItems(res.value ?? []);
      setTrail(prev => prev.slice(0, index + 1));
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message :
        typeof e === "string" ? e :
        "Error al navegar";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /* ======= Recargar carpeta actual ======= */
  const refresh = async () => {
    if (!siteId || !currentFolder) return;
    setLoading(true);
    setError(null);
    try {
      const client = await getGraph();
      const res = await client
        .api(`/sites/${siteId}/drive/items/${currentFolder.id}/children`)
        .select("id,name,size,lastModifiedDateTime,webUrl,file,folder")
        .orderby("lastModifiedDateTime desc")
        .get() as GraphListResponse<DriveItem>;
      setItems(res.value ?? []);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message :
        typeof e === "string" ? e :
        "Error al recargar";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          Documentos — <span className="text-slate-600">{FOLDER_PATH}</span>
        </h1>
        <button
          onClick={refresh}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
          disabled={loading || !currentFolder}
          title="Recargar"
        >
          {loading ? "Cargando…" : "Refrescar"}
        </button>
      </div>

      {/* Breadcrumb */}
      {trail.length > 0 && (
        <nav className="mb-3 text-sm text-slate-600">
          {trail.map((node, i) => (
            <span key={node.id}>
              <button
                className={`underline-offset-2 ${i === trail.length - 1 ? "text-slate-900 font-medium underline" : "hover:underline"}`}
                onClick={() => (i === trail.length - 1 ? undefined : goToTrailIndex(i))}
                disabled={i === trail.length - 1}
              >
                {i === 0 ? baseFolder?.name ?? "Base" : node.name}
              </button>
              {i < trail.length - 1 && <span className="mx-2 text-slate-400">/</span>}
            </span>
          ))}
        </nav>
      )}

      {error && <div className="p-4 text-red-600 border border-red-200 rounded-lg">{error}</div>}
      {!error && loading && <div className="p-4">Cargando documentos…</div>}
      {!loading && !error && items.length === 0 && (
        <div className="p-4">No hay archivos en esta carpeta.</div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left">Nombre</th>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">Tamaño</th>
                <th className="p-3 text-left">Modificado</th>
                <th className="p-3 text-left">Acción</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const isFolder = !!it.folder;
                return (
                  <tr key={it.id} className="border-t">
                    <td className="p-3">
                      {isFolder ? (
                        <button
                          onClick={() => openFolder({ id: it.id, name: it.name })}
                          className="text-blue-700 hover:underline"
                          title="Abrir carpeta"
                        >
                          📁 {it.name}
                        </button>
                      ) : (
                        <span>📄 {it.name}</span>
                      )}
                    </td>
                    <td className="p-3">
                      {isFolder ? "Carpeta" : it.file?.mimeType ?? "Archivo"}
                    </td>
                    <td className="p-3">{isFolder ? "-" : toHumanSize(it.size)}</td>
                    <td className="p-3">{toLocal(it.lastModifiedDateTime)}</td>
                    <td className="p-3">
                      {it.webUrl ? (
                        <a
                          className="text-blue-600 underline"
                          href={it.webUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
