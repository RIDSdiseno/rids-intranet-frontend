import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReloadOutlined, CloseCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { http } from "../service/http";
import { getCache, setCache } from "../lib/localCache";
import { notification } from "antd";

type SolicitanteRow = {
  id_solicitante: number;
  nombre: string;
  email?: string | null;
  empresa?: { id_empresa: number; nombre: string } | null;
  isActive?: boolean | null;
};

export default function Mailer() {
  const [solicitantes, setSolicitantes] = useState<SolicitanteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastErrorDetail, setLastErrorDetail] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [selectAll, setSelectAll] = useState(false);
  const [empresas, setEmpresas] = useState<Array<{ id_empresa: number; nombre: string }>>([]);
  const [tecnicos, setTecnicos] = useState<Array<{ id_tecnico: number; nombre: string; email?: string | null }>>([]);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [showTecnicos, setShowTecnicos] = useState(false);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("Mensaje desde RIDS");
  const [body, setBody] = useState("<p>Hola,</p><p>Este es un mensaje masivo enviado desde RIDS.</p><p>Saludos.</p>");
  const [editHtml, setEditHtml] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const isTypingRef = useRef(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ name: string; contentType: string; contentBytes: string; size: number }>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadSolicitantes = useCallback(async (empresaFilter?: number | null) => {
    setLoading(true);
    setError(null);
    setLastErrorDetail(null);
    try {
      const { data } = await http.get("/solicitantes/mailer", { params: { ...(empresaFilter ? { empresaId: empresaFilter } : {}) } });
      const items: SolicitanteRow[] = Array.isArray(data?.items) ? data.items : data?.items ?? [];

      // aplicar mismo saneamiento: isActive !== false, nombre no vacío, email presente
      const active = items.filter((s) => s.isActive !== false);
      const cleaned = active.filter((s) => typeof s.nombre === "string" && s.nombre.trim() !== "");
      const withEmail = cleaned.filter((s) => typeof s.email === "string" && s.email.trim() !== "");

      setSolicitantes(withEmail);

      const sel: Record<number, boolean> = {};
      withEmail.forEach((s) => { sel[s.id_solicitante] = false; });
      setSelected(sel);
      setSelectAll(false);
    } catch (e: any) {
      let msg = "Error inesperado";
      try {
        if (e?.response?.data) {
          const d = e.response.data;
          msg = d.error ?? d.message ?? JSON.stringify(d);
        } else if (e?.message) {
          msg = e.message;
        } else {
          msg = String(e);
        }
      } catch (_err) {
        msg = String(e);
      }

      setError(msg);
      try {
        setLastErrorDetail(JSON.stringify(e.response?.data ?? e.response ?? e.message ?? String(e), null, 2));
      } catch (_err) {
        setLastErrorDetail(String(e));
      }
      // eslint-disable-next-line no-console
      console.error("Mailer.loadSolicitantes error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // load empresas once — use cache if available
    (async () => {
      try {
        const cached = getCache<Array<{ id_empresa: number; nombre: string }>>("empresas");
        if (cached && Array.isArray(cached)) {
          setEmpresas(cached);
        } else {
          const { data } = await http.get("/empresas");
          const list = Array.isArray(data?.data) ? data.data : (data ?? []);
          const mapped = list.map((e: any) => ({ id_empresa: e.id_empresa, nombre: e.nombre }));
          setEmpresas(mapped);
          // cache 24h
          setCache("empresas", mapped, 24 * 60 * 60 * 1000);
        }
      } catch (e) {
        // ignore
      }
    })();

    // load tecnicos (non-blocking)
    (async () => {
      try {
        const { data } = await http.get("/tecnicos", { params: { page: 1, pageSize: 500 } });
        const items = data?.data ?? data?.items ?? data ?? [];
        setTecnicos(Array.isArray(items) ? items : []);
      } catch (e) {
        // ignore
      }
    })();

    void loadSolicitantes(empresaId);
  }, [loadSolicitantes, empresaId]);

  const reload = async () => {
    // recargar solicitantes y recursos auxiliares
    try {
      await loadSolicitantes(empresaId);
    } catch (e) {
      // loadSolicitantes maneja errores internamente
    }

    try {
      const { data } = await http.get("/empresas");
      const list = Array.isArray(data?.data) ? data.data : (data ?? []);
      const mapped = list.map((e: any) => ({ id_empresa: e.id_empresa, nombre: e.nombre }));
      setEmpresas(mapped);
      setCache("empresas", mapped, 24 * 60 * 60 * 1000);
    } catch (e) {
      // ignore
    }

    try {
      const { data } = await http.get("/tecnicos", { params: { page: 1, pageSize: 500 } });
      const items = data?.data ?? data?.items ?? data ?? [];
      setTecnicos(Array.isArray(items) ? items : []);
    } catch (e) {
      // ignore
    }
  };

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return solicitantes;
    return solicitantes.filter((s) => {
      return (
        String(s.nombre ?? "").toLowerCase().includes(q) ||
        String(s.email ?? "").toLowerCase().includes(q) ||
        String(s.empresa?.nombre ?? "").toLowerCase().includes(q)
      );
    });
  }, [search, solicitantes]);

  // rows: what to display in the table. If a tecnico is selected, show that tecnico only (mapped to row shape), otherwise show filtered solicitantes
  const rows = useMemo(() => {
    if (showTecnicos) {
      return tecnicos.map((t) => ({ id: -t.id_tecnico, nombre: t.nombre, email: t.email ?? null, empresa: null, isActive: true }));
    }
    return filtered.map((s) => ({ id: s.id_solicitante, nombre: s.nombre, email: s.email ?? null, empresa: s.empresa ?? null, isActive: s.isActive }));
  }, [showTecnicos, tecnicos, filtered]);

  // keep editor DOM in sync with `body` only when user is not typing
  React.useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (isTypingRef.current) return;
    if (el.innerHTML !== body) el.innerHTML = body;
  }, [body]);

  function toggleOne(id: number) {
    setSelected((cur) => ({ ...cur, [id]: !cur[id] }));
  }

  function toggleAll() {
    setSelectAll((cur) => {
      const next = !cur;
      const out: Record<number, boolean> = {};
      rows.forEach((r) => { out[r.id] = next; });
      setSelected(out);
      return next;
    });
  }

  function handleClear() {
    setSearch("");
    const out: Record<number, boolean> = {};
    rows.forEach((r) => { out[r.id] = false; });
    setSelected(out);
    setSelectAll(false);
  }

  function handleSend() {
    // collect all candidates (solicitantes + tecnicos mapped)
    const allCandidates: Array<{ id: number; nombre: string; email?: string | null }> = [];
    solicitantes.forEach((s) => allCandidates.push({ id: s.id_solicitante, nombre: s.nombre, email: s.email ?? null }));
    tecnicos.forEach((t) => allCandidates.push({ id: -t.id_tecnico, nombre: t.nombre, email: t.email ?? null }));

    const targets = allCandidates.filter((c) => selected[c.id] && c.email).map((c) => ({ id: c.id, nombre: c.nombre, email: c.email }));
    if (targets.length === 0) {
      try { alert("Selecciona al menos un destinatario con email"); } catch {}
      return;
    }

    (async () => {
      setIsSending(true);
      try {
        const payload = { targets, subject, bodyHtml: body, attachments };
        const { data } = await http.post("/correo/enviar-masivo", payload);
        // eslint-disable-next-line no-console
        console.log('Bulk send result:', data);

        if (data?.ok && data?.queued) {
          const mins = Math.round((data.estimatedCompletionMs || 0) / 60000 * 100) / 100;
          notification.success({
            message: `Envio en cola`,
            description: `Job ${data.jobId} — ${data.queuedCount} destinatario(s) en cola. Tasa ${data.ratePerMin} por minuto. Est. ${mins} min.`,
            duration: 8,
          });
        } else if (data?.ok) {
          notification.success({
            message: `Envío completado`,
            description: `Enviados: ${data.sent} / ${data.requested}`,
            duration: 6,
          });

          if (Array.isArray(data.failures) && data.failures.length > 0) {
            const first = data.failures.slice(0, 3).map((f: any) => `${f.to} → ${f.error}`).join("\n");
            notification.error({
              message: `Algunos envíos fallaron (${data.failures.length})`,
              description: first + (data.failures.length > 3 ? `\n...y ${data.failures.length - 3} más` : ""),
              duration: 10,
            });
          }
        } else {
          notification.error({
            message: `Error en envío`,
            description: String(data?.message ?? "Respuesta inválida del servidor"),
            duration: 8,
          });
        }
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('Bulk send error:', err);
        const msg = err?.response?.data?.message ?? err?.message ?? String(err);
        notification.error({ message: `Error al enviar`, description: msg, duration: 8 });
      } finally {
        setIsSending(false);
      }
    })();
  }

  // Convertir File a base64 contentBytes sin prefijo data: (usar readAsDataURL)
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string | null;
          if (!result) return resolve("");
          const comma = result.indexOf(',');
          resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      } catch (e) {
        reject(e);
      }
    });
  };

  const onFilesPicked = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const maxPerFile = 5 * 1024 * 1024; // 5MB límite por defecto
    const out = [...attachments];
    for (const f of Array.from(files)) {
      if (f.size > maxPerFile) {
        notification.warning({ message: 'Archivo omitido', description: `${f.name} excede el límite de ${Math.round(maxPerFile/1024/1024)}MB` });
        continue;
      }
      try {
        const contentBytes = await fileToBase64(f);
        out.push({ name: f.name, contentType: f.type || 'application/octet-stream', contentBytes, size: f.size });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error leyendo archivo', f.name, e);
        notification.error({ message: 'Error leyendo archivo', description: f.name });
      }
    }
    setAttachments(out);
    // limpiar input para poder volver a seleccionar mismos archivos
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  function removeAttachment(idx: number) {
    setAttachments((cur) => cur.filter((_, i) => i !== idx));
  }

  const empresasCount = empresas.length;

  const defaultLogo = 'https://res.cloudinary.com/dvqpmttci/image/upload/v1774008233/Logo_Firma_bcm1bs.gif';
  const env = (typeof window !== 'undefined' && import.meta && import.meta.env) ? import.meta.env : {};
  const envDataLogo = env.VITE_APP_LOGO_DATAURL || env.VITE_APP_LOGO_DATA_URL || '';
  const envLogo = env.VITE_APP_LOGO_URL || '';
  const logoUrl = (envDataLogo || envLogo) || ((typeof window !== 'undefined' && window.location && window.location.origin)
    ? `${window.location.origin}/img/splash.png`
    : defaultLogo);

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <header className="rounded-2xl border border-cyan-200 px-6 py-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="bg-white p-2 rounded-md shadow-xs" style={{ display: 'inline-block' }}>
                <img src={logoUrl} alt="RIDS" style={{ height: 42, objectFit: 'contain', display: 'block' }} />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Mailer</h2>
                <p className="text-sm text-slate-500">Envíos masivos y notificaciones</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                title="Limpiar selección"
                aria-label="Limpiar"
                onClick={handleClear}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 bg-white hover:bg-slate-50"
              >
                <CloseCircleOutlined />
                Limpiar
              </button>

              <button
                title="Recargar datos"
                aria-label="Recargar"
                onClick={reload}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-cyan-800 border border-cyan-200 bg-white hover:bg-cyan-50"
              >
                <ReloadOutlined />
                Recargar
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="w-full md:w-72">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, email o empresa..."
                  className="border border-cyan-200 rounded-xl pl-10 pr-4 py-2 text-sm w-full focus:ring-2 focus:ring-cyan-400"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <SearchOutlined />
                </div>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-end gap-3">
              <select
                value={showTecnicos ? "tecnicos" : (empresaId ? `company:${empresaId}` : "")}
                onChange={(e) => {
                  const v = e.target.value || "";
                  if (v === "tecnicos") {
                    setShowTecnicos(true);
                    setEmpresaId(null);
                  } else if (v.startsWith("company:")) {
                    setEmpresaId(Number(v.split(":")[1]));
                    setShowTecnicos(false);
                  } else {
                    setEmpresaId(null);
                    setShowTecnicos(false);
                  }
                }}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Todas las empresas</option>
                <optgroup label="Empresas">
                  {empresas.map((em) => (
                    <option key={`c-${em.id_empresa}`} value={`company:${em.id_empresa}`}>{em.nombre}</option>
                  ))}
                </optgroup>
                <optgroup label="Técnicos RIDS">
                  <option value="tecnicos">RIDS (ver todos)</option>
                </optgroup>
              </select>
            </div>
          </div>
        </header>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Error cargando datos</div>
                <div className="text-sm mt-1">{String(error)}</div>
                <div className="text-xs text-slate-500 mt-1">Asegúrate de que el backend esté levantado en `VITE_API_URL`.</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={reload} className="rounded-full px-3 py-1.5 bg-white border border-slate-200 text-sm">Reintentar</button>
              </div>
            </div>
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4 text-center">
            <div className="text-sm text-slate-500">Solicitantes</div>
            <div className="mt-2 text-2xl fo
            nt-bold text-slate-900">{solicitantes.length}</div>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <div className="text-sm text-slate-500">Empresas</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{empresasCount}</div>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <div className="text-sm text-slate-500">Seleccionados</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{selectedCount}</div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-cyan-100 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">Lista de destinatarios</div>
            <div className="flex items-center gap-2">
              <button onClick={toggleAll} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm">Seleccionar todos</button>
              <button onClick={() => setShowPreview(true)} className="rounded-full bg-cyan-600 px-4 py-2 text-sm text-white">Ver Previsualización</button>
            </div>
          </div>

          {/* Los campos de asunto y mensaje se muestran dentro del modal de previsualización */}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="px-3 py-2"><input type="checkbox" checked={selectAll} onChange={toggleAll} /></th>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Empresa</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">Cargando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">Sin resultados</td></tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={r.id} className="align-top">
                      <td className="px-3 py-3 text-sm text-slate-700"><input type="checkbox" checked={!!selected[r.id]} onChange={() => toggleOne(r.id)} /></td>
                      <td className="px-3 py-3 text-sm text-slate-700">{i + 1}</td>
                      <td className="px-3 py-3 text-sm font-medium text-slate-800">{r.nombre}</td>
                      <td className="px-3 py-3 text-sm text-slate-600">{r.empresa?.nombre ?? "-"}</td>
                      <td className="px-3 py-3 text-sm text-slate-600">{r.email ?? "-"}</td>
                      <td className="px-3 py-3 text-sm text-slate-600">{r.isActive !== false ? "Activo" : "Inactivo"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        {showPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg max-h-[80vh] overflow-auto">
              <h3 className="text-lg font-bold">Previsualización de correo</h3>
                <div className="mt-3 text-sm text-slate-700">
                <div>
                  <label className="text-sm font-medium">Asunto</label>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
                </div>

                <div className="mt-3">
                  <div className="text-sm font-medium">Para ({Object.values(selected).filter(Boolean).length})</div>
                  <div className="mt-2 max-h-36 overflow-auto rounded-md border p-2 bg-slate-50 text-sm">
                    {(() => {
                      const allCandidates: Array<{ id: number; nombre: string; email?: string | null }> = [];
                      solicitantes.forEach((s) => allCandidates.push({ id: s.id_solicitante, nombre: s.nombre, email: s.email ?? null }));
                      tecnicos.forEach((t) => allCandidates.push({ id: -t.id_tecnico, nombre: t.nombre, email: t.email ?? null }));
                      return allCandidates.filter((c) => selected[c.id]).map((r) => (
                        <div key={r.id} className="text-sm">{r.nombre} &lt;{r.email ?? "-"}&gt;</div>
                      ));
                    })()}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Mensaje</label>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setEditHtml((v) => !v)} className="rounded-full border px-2 py-1 text-sm">{editHtml ? "WYSIWYG" : "HTML"}</button>
                    </div>
                  </div>

                  {editHtml ? (
                    <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className="mt-2 w-full rounded-md border px-3 py-2 text-sm" />
                  ) : (
                    <div className="mt-2">
                      <div className="mb-3">
                        <div className="rounded-md border bg-slate-50 px-2 py-2 flex items-center gap-2 shadow-sm">
                          <button type="button" onClick={() => document.execCommand('bold')} title="Negrita" className="flex h-8 w-8 items-center justify-center rounded hover:bg-white text-slate-700 hover:shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M11.5 7a2.5 2.5 0 010 5H8V7h3.5zM7 4h4a4 4 0 010 8H7V4z"/></svg>
                          </button>
                          <button type="button" onClick={() => document.execCommand('italic')} title="Cursiva" className="flex h-8 w-8 items-center justify-center rounded hover:bg-white text-slate-700 hover:shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M7 4v2h2.21l-2.12 8H4v2h6v-2H8.79l2.12-8H14V4H7z"/></svg>
                          </button>
                          <button type="button" onClick={() => document.execCommand('underline')} title="Subrayado" className="flex h-8 w-8 items-center justify-center rounded hover:bg-white text-slate-700 hover:shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3v6a5 5 0 0010 0V3h-2v6a3 3 0 11-6 0V3H5zM4 16h12v2H4v-2z"/></svg>
                          </button>
                          <div className="border-l h-6" />
                          <button type="button" onClick={() => document.execCommand('insertUnorderedList')} title="Lista" className="flex h-8 w-8 items-center justify-center rounded hover:bg-white text-slate-700 hover:shadow-md">•</button>
                          <button type="button" onClick={() => document.execCommand('insertOrderedList')} title="Lista numerada" className="flex h-8 w-8 items-center justify-center rounded hover:bg-white text-slate-700 hover:shadow-md">1.</button>
                          <div className="border-l h-6" />
                          <button type="button" onClick={() => { const url = prompt('URL de enlace'); if (url) document.execCommand('createLink', false, url); }} title="Insertar enlace" className="flex h-8 w-8 items-center justify-center rounded hover:bg-white text-slate-700 hover:shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M12.59 7.41a3 3 0 114.24 4.24l-1.42 1.42a3 3 0 11-4.24-4.24l.71-.71zM6.34 13.66a3 3 0 01-4.24-4.24l1.42-1.42a3 3 0 014.24 4.24l-.71.71z"/></svg>
                          </button>
                          <div className="flex-1" />
                          <button type="button" onClick={() => { document.execCommand('removeFormat'); }} title="Limpiar formato" className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-white">Limpiar</button>
                        </div>
                          <div className="mt-2">
                            <div
                              ref={editorRef}
                              contentEditable
                              suppressContentEditableWarning
                              onInput={() => { if (editorRef.current) setBody(editorRef.current.innerHTML); }}
                              onFocus={() => { isTypingRef.current = true; }}
                              onBlur={() => { isTypingRef.current = false; if (editorRef.current) setBody(editorRef.current.innerHTML); }}
                              className="min-h-[180px] rounded-md border px-4 py-3 text-sm shadow-sm focus-within:ring-2 focus-within:ring-cyan-200"
                            />
                          </div>
                      </div>
                    </div>
                  )}

                </div>

                <div className="mt-3">
                  <div className="text-sm font-semibold">Previsualización</div>
                  <div className="mt-2 rounded-md border p-3 bg-white text-sm text-slate-800 overflow-auto max-h-[45vh]">
                    <div dangerouslySetInnerHTML={{ __html: body }} />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setShowPreview(false)} className="rounded-full border border-slate-200 px-4 py-2 text-sm">Cerrar</button>
                <button disabled={isSending} onClick={() => { setShowPreview(false); handleSend(); }} className={`rounded-full px-4 py-2 text-sm text-white ${isSending ? 'bg-slate-400' : 'bg-cyan-600'}`}>
                  {isSending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
