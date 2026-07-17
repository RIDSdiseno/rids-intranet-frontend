import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReloadOutlined, CloseCircleOutlined, SearchOutlined,
  MailOutlined, UserOutlined, BankOutlined, InfoCircleOutlined, WarningOutlined,
} from "@ant-design/icons";
import { http } from "../service/http";
import { getCache, setCache } from "../lib/localCache";
import { notification } from "antd";

// ─── Types ───────────────────────────────────────────────────────────────────

type SolicitanteRow = {
  id_solicitante: number;
  nombre: string;
  email?: string | null;
  empresa?: { id_empresa: number; nombre: string } | null;
  isActive?: boolean | null;
};

type SendMode = "html" | "plain";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isValidEmail = (e?: string | null) => typeof e === "string" && EMAIL_RE.test(e.trim());

// Empresas excluidas del Mailer (ya no operativas)
const EXCLUDED_EMPRESAS = /infinet|vprime|v\.?prime|t[-\s]?sales/i;

const DEFAULT_CONTENT = "<p>Escribe aquí el contenido de tu mensaje...</p>";

/** Igual al patrón de SendOrdenModal: convierte /img/splash.png a base64 para que funcione en emails externos */
async function embedLogoInHtml(html: string): Promise<string> {
  try {
    if (!html.includes("/img/splash.png")) return html;
    const resp = await fetch("/img/splash.png");
    if (!resp.ok) return html;
    const blob = await resp.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return html.replace(/src=["']\/img\/splash\.png["']/g, `src="${dataUrl}"`);
  } catch { return html; }
}

/** Template de email compatible con todos los clientes de correo (Outlook, Gmail, Apple Mail).
 *  Usa tablas HTML en lugar de flexbox/grid, y color sólido en lugar de gradientes. */
function wrapInTemplate(contentHtml: string): string {
  const safeLogoUrl = "/img/splash.png";
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Mensaje RIDS</title></head>
<body style="margin:0;padding:0;background-color:#f0f6f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f6f9;">
  <tr>
    <td align="center" style="padding:28px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2f0f5;">

        <!-- Header -->
        <tr>
          <td style="background-color:#0891b2;padding:22px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="52" valign="middle">
                  <img src="${safeLogoUrl}" alt="RIDS" width="44" height="44" style="display:block;width:44px;height:44px;object-fit:contain;border-radius:6px;background:#fff;padding:3px;" />
                </td>
                <td valign="middle" style="padding-left:12px;">
                  <div style="font-size:17px;font-weight:700;color:#ffffff;line-height:1.2;">RIDS</div>
                  <div style="font-size:11px;color:rgba(255,255,255,0.85);margin-top:2px;">Plataforma de gestión</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Contenido -->
        <tr>
          <td style="padding:28px 28px 20px;color:#374151;font-size:14px;line-height:1.65;">
            ${contentHtml}
            <p style="margin:24px 0 4px;font-size:14px;color:#374151;">Saludos cordiales,</p>
            <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">Equipo RIDS</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #e2f0f5;background-color:#f8fbfd;padding:14px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:11px;color:#94a3b8;">© RIDS · Plataforma de gestión</td>
                <td align="right" style="font-size:11px;color:#cbd5e1;">Si no esperabas este mensaje, ignóralo.</td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Extrae texto plano desde HTML */
function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function Mailer() {
  const [solicitantes, setSolicitantes] = useState<SolicitanteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [selectAll, setSelectAll] = useState(false);
  const [empresas, setEmpresas] = useState<Array<{ id_empresa: number; nombre: string }>>([]);
  const [tecnicos, setTecnicos] = useState<Array<{ id_tecnico: number; nombre: string; email?: string | null }>>([]);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [showTecnicos, setShowTecnicos] = useState(false);
  const [search, setSearch] = useState("");

  // ── Composición del correo ──
  const [subject, setSubject] = useState("Mensaje desde RIDS");
  /** Solo el contenido que escribe el usuario — sin template */
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [editHtml, setEditHtml] = useState(false);
  const [sendMode, setSendMode] = useState<SendMode>("html");

  const editorRef = useRef<HTMLDivElement | null>(null);
  const isTypingRef = useRef(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ name: string; contentType: string; contentBytes: string; size: number }>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /** HTML final que se envía: template + contenido del usuario */
  const fullHtml = useMemo(() => wrapInTemplate(content), [content]);

  // ─── Data loading ──────────────────────────────────────────────────────────

  const loadSolicitantes = useCallback(async (empresaFilter?: number | null) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await http.get("/solicitantes/mailer", { params: empresaFilter ? { empresaId: empresaFilter } : {} });
      const items: SolicitanteRow[] = Array.isArray(data?.items) ? data.items : [];
      const cleaned = items
        .filter((s) => s.isActive !== false)
        .filter((s) => typeof s.nombre === "string" && s.nombre.trim() !== "")
        .filter((s) => isValidEmail(s.email))
        .filter((s) => !EXCLUDED_EMPRESAS.test(s.empresa?.nombre ?? ""));
      setSolicitantes(cleaned);
      const sel: Record<number, boolean> = {};
      cleaned.forEach((s) => { sel[s.id_solicitante] = false; });
      setSelected(sel);
      setSelectAll(false);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cached = getCache<Array<{ id_empresa: number; nombre: string }>>("empresas");
        if (cached && Array.isArray(cached)) {
          setEmpresas(cached);
        } else {
          const { data } = await http.get("/empresas");
          const list = Array.isArray(data?.data) ? data.data : (data ?? []);
          const mapped = list
            .map((e: any) => ({ id_empresa: e.id_empresa, nombre: e.nombre }))
            .filter((e: { id_empresa: number; nombre: string }) => !EXCLUDED_EMPRESAS.test(e.nombre));
          setEmpresas(mapped);
          setCache("empresas", mapped, 24 * 60 * 60 * 1000);
        }
      } catch { /* ignore */ }
    })();
    (async () => {
      try {
        const { data } = await http.get("/tecnicos", { params: { page: 1, pageSize: 500 } });
        const items = data?.data ?? data?.items ?? data ?? [];
        setTecnicos(Array.isArray(items) ? items : []);
      } catch { /* ignore */ }
    })();
    void loadSolicitantes(empresaId);
  }, [loadSolicitantes, empresaId]);

  const reload = async () => {
    await loadSolicitantes(empresaId).catch(() => {});
    try {
      const { data } = await http.get("/empresas");
      const list = Array.isArray(data?.data) ? data.data : (data ?? []);
      const mapped = list
        .map((e: any) => ({ id_empresa: e.id_empresa, nombre: e.nombre }))
        .filter((e: { id_empresa: number; nombre: string }) => !EXCLUDED_EMPRESAS.test(e.nombre));
      setEmpresas(mapped);
      setCache("empresas", mapped, 24 * 60 * 60 * 1000);
    } catch { /* ignore */ }
    try {
      const { data } = await http.get("/tecnicos", { params: { page: 1, pageSize: 500 } });
      const items = data?.data ?? data?.items ?? data ?? [];
      setTecnicos(Array.isArray(items) ? items : []);
    } catch { /* ignore */ }
  };

  // ─── Selección ─────────────────────────────────────────────────────────────

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return solicitantes;
    return solicitantes.filter((s) =>
      String(s.nombre ?? "").toLowerCase().includes(q) ||
      String(s.email ?? "").toLowerCase().includes(q) ||
      String(s.empresa?.nombre ?? "").toLowerCase().includes(q)
    );
  }, [search, solicitantes]);

  const rows = useMemo(() => {
    if (showTecnicos) {
      return tecnicos
        .filter((t) => isValidEmail(t.email))
        .map((t) => ({ id: -t.id_tecnico, nombre: t.nombre, email: t.email ?? null, empresa: null, isActive: true }));
    }
    return filtered.map((s) => ({ id: s.id_solicitante, nombre: s.nombre, email: s.email ?? null, empresa: s.empresa ?? null, isActive: s.isActive }));
  }, [showTecnicos, tecnicos, filtered]);

  function toggleOne(id: number) { setSelected((cur) => ({ ...cur, [id]: !cur[id] })); }

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
    setSubject("Mensaje desde RIDS");
    setContent(DEFAULT_CONTENT);
    setAttachments([]);
    if (editorRef.current) editorRef.current.innerHTML = DEFAULT_CONTENT;
  }

  // ─── Editor toolbar helpers ────────────────────────────────────────────────

  function insertList(ordered: boolean) {
    const editor = editorRef.current;
    if (!editor) return;

    const tag = ordered ? "ol" : "ul";

    // Detectar si el cursor ya está dentro de una lista del mismo tipo → sacarla
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
      while (node && node !== editor) {
        if (node.nodeName === tag.toUpperCase()) {
          // Reemplazar la lista por sus <li> como párrafos
          const listEl = node as HTMLElement;
          const fragment = document.createDocumentFragment();
          listEl.querySelectorAll("li").forEach((li) => {
            const p = document.createElement("p");
            p.innerHTML = li.innerHTML || "<br>";
            fragment.appendChild(p);
          });
          listEl.parentNode?.replaceChild(fragment, listEl);
          setContent(editor.innerHTML);
          return;
        }
        node = node.parentNode;
      }
    }

    // Insertar nueva lista al final
    const list = document.createElement(tag);
    const li = document.createElement("li");
    li.appendChild(document.createElement("br"));
    list.appendChild(li);
    editor.appendChild(list);

    editor.focus();
    const range = document.createRange();
    range.setStart(li, 0);
    range.collapse(true);
    const s = window.getSelection();
    if (s) { s.removeAllRanges(); s.addRange(range); }

    setContent(editor.innerHTML);
  }

  // ─── Editor sync ───────────────────────────────────────────────────────────

  // Mantiene el editor WYSIWYG sincronizado cuando `content` cambia externamente
  React.useEffect(() => {
    const el = editorRef.current;
    if (!el || isTypingRef.current) return;
    if (el.innerHTML !== content) el.innerHTML = content;
  }, [content]);

  // ─── Envío ─────────────────────────────────────────────────────────────────

  function handleSend(mode: SendMode) {
    const allCandidates = [
      ...solicitantes.map((s) => ({ id: s.id_solicitante, nombre: s.nombre, email: s.email ?? null })),
      ...tecnicos.map((t) => ({ id: -t.id_tecnico, nombre: t.nombre, email: t.email ?? null })),
    ];
    const targets = allCandidates.filter((c) => selected[c.id] && isValidEmail(c.email)).map((c) => ({ id: c.id, nombre: c.nombre, email: c.email }));
    if (targets.length === 0) {
      notification.warning({ message: "Sin destinatarios", description: "Selecciona al menos un destinatario con email válido." });
      return;
    }

    (async () => {
      setIsSending(true);
      try {
        const rawHtml = mode === "html" ? fullHtml : `<p style="font-family:Arial,sans-serif;font-size:14px;color:#374151;line-height:1.65;">${content.replace(/\n/g, "<br/>")}</p>`;
        const bodyHtml = mode === "html" ? await embedLogoInHtml(rawHtml) : rawHtml;
        const { data } = await http.post("/correo/enviar-masivo", { targets, subject, bodyHtml, attachments });
        if (data?.ok && data?.queued) {
          notification.success({
            message: "Enviando correos",
            description: `${data.queuedCount} destinatario(s) en proceso. Los correos se están enviando ahora.`,
            duration: 6,
          });
        } else if (data?.ok) {
          notification.success({ message: "Envío completado", description: `Enviados: ${data.sent} / ${data.requested}`, duration: 6 });
          if (Array.isArray(data.failures) && data.failures.length > 0) {
            const preview = data.failures.slice(0, 3).map((f: any) => `${f.to} → ${f.error}`).join("\n");
            notification.error({ message: `${data.failures.length} envío(s) fallaron`, description: preview, duration: 10 });
          }
        } else {
          notification.error({ message: "Error en envío", description: String(data?.message ?? "Respuesta inválida"), duration: 8 });
        }
      } catch (err: any) {
        notification.error({ message: "Error al enviar", description: err?.response?.data?.message ?? err?.message ?? String(err), duration: 8 });
      } finally {
        setIsSending(false);
      }
    })();
  }

  // ─── Adjuntos ──────────────────────────────────────────────────────────────

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string | null;
        if (!result) return resolve("");
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const onFilesPicked = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const out = [...attachments];
    for (const f of Array.from(files)) {
      if (f.size > 5 * 1024 * 1024) {
        notification.warning({ message: "Archivo omitido", description: `${f.name} excede 5 MB` });
        continue;
      }
      try {
        const contentBytes = await fileToBase64(f);
        out.push({ name: f.name, contentType: f.type || "application/octet-stream", contentBytes, size: f.size });
      } catch { notification.error({ message: "Error leyendo archivo", description: f.name }); }
    }
    setAttachments(out);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const showSpamWarning = selectedCount > 80;

  return (
    <div className="flex flex-col gap-5 p-6">

      {/* Header */}
      <div className="rounded-3xl border border-cyan-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 px-6 pt-5 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
              <MailOutlined style={{ fontSize: 18 }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">Mailer</h1>
              <p className="text-xs text-slate-400">Envíos masivos y notificaciones</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleClear} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition">
              <CloseCircleOutlined /> Limpiar
            </button>
            <button onClick={reload} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-100 transition disabled:opacity-60">
              <ReloadOutlined className={loading ? "animate-spin" : ""} /> Recargar
            </button>
          </div>
        </div>
        <div className="border-t border-slate-100 px-6 py-3 bg-slate-50/50">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, email o empresa..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
              <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            </div>
            <select
              value={showTecnicos ? "tecnicos" : (empresaId ? `company:${empresaId}` : "")}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "tecnicos") { setShowTecnicos(true); setEmpresaId(null); }
                else if (v.startsWith("company:")) { setEmpresaId(Number(v.split(":")[1])); setShowTecnicos(false); }
                else { setEmpresaId(null); setShowTecnicos(false); }
              }}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 sm:w-56"
            >
              <option value="">Todas las empresas</option>
              <optgroup label="Empresas">
                {empresas.map((em) => <option key={`c-${em.id_empresa}`} value={`company:${em.id_empresa}`}>{em.nombre}</option>)}
              </optgroup>
              <optgroup label="Técnicos RIDS">
                <option value="tecnicos">RIDS (ver todos)</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="font-semibold">Error cargando datos:</span> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Solicitantes", value: solicitantes.length, icon: <UserOutlined />, iconBg: "bg-slate-100 text-slate-500", bar: "bg-slate-200" },
          { label: "Empresas", value: empresas.length, icon: <BankOutlined />, iconBg: "bg-cyan-100 text-cyan-600", bar: "bg-cyan-300" },
          { label: "Seleccionados", value: selectedCount, icon: <MailOutlined />, iconBg: selectedCount > 0 ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400", bar: selectedCount > 0 ? "bg-emerald-400" : "bg-slate-200" },
        ].map(({ label, value, icon, iconBg, bar }) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs ${iconBg}`}>{icon}</div>
            </div>
            <p className="text-3xl font-black text-slate-900 leading-none">{value.toLocaleString()}</p>
            <div className="mt-3 h-1 w-full rounded-full bg-slate-100">
              <div className={`h-1 rounded-full transition-all ${bar}`} style={{ width: value > 0 ? "100%" : "0%" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Anti-spam info */}
      <div className={`rounded-2xl border px-4 py-3 text-sm flex items-center gap-3 ${showSpamWarning ? "border-amber-200 bg-amber-50 text-amber-800" : "border-cyan-100 bg-cyan-50/60 text-cyan-800"}`}>
        <span className="shrink-0">{showSpamWarning ? <WarningOutlined className="text-amber-500" /> : <InfoCircleOutlined className="text-cyan-500" />}</span>
        <span>
          {showSpamWarning
            ? <><span className="font-semibold">Precaución:</span> Más de 80 destinatarios puede aumentar el riesgo de spam. Considera segmentar por empresa.</>
            : <>Envío inmediato a todos los seleccionados. Solo contactos activos con correo válido.{selectedCount > 0 && <span className="ml-1 font-semibold text-cyan-700">{selectedCount} seleccionado{selectedCount !== 1 ? "s" : ""}.</span>}</>
          }
        </span>
      </div>

      {/* Tabla de destinatarios */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
          <div>
            <p className="text-sm font-bold text-slate-800">Lista de destinatarios</p>
            <p className="text-xs text-slate-400">
              {loading ? "Cargando..." : `${rows.length.toLocaleString()} contactos activos`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleAll} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition">
              {selectAll ? "Deseleccionar" : "Seleccionar todos"}
            </button>
            <button onClick={() => setShowPreview(true)} disabled={selectedCount === 0}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 transition disabled:cursor-not-allowed disabled:opacity-40 shadow-sm">
              Ver previsualización {selectedCount > 0 && <span className="ml-1 rounded-full bg-white/25 px-1.5">{selectedCount}</span>}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="px-4 py-3 w-10"><input type="checkbox" checked={selectAll} onChange={toggleAll} className="rounded accent-cyan-600" /></th>
                <th className="px-3 py-3 w-10">#</th>
                <th className="px-3 py-3">Nombre</th>
                <th className="px-3 py-3">Empresa</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3 text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">Cargando contactos...</td></tr>
                : rows.length === 0
                  ? <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">Sin resultados para esta búsqueda</td></tr>
                  : rows.map((r, i) => {
                    const initials = r.nombre.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
                    const isSelected = !!selected[r.id];
                    return (
                      <tr key={r.id} onClick={() => toggleOne(r.id)}
                        className={`cursor-pointer border-b border-slate-50 transition-colors ${isSelected ? "bg-cyan-50/70" : "hover:bg-slate-50/80"}`}>
                        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleOne(r.id)} className="rounded accent-cyan-600" />
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-400 tabular-nums">{i + 1}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-[10px] font-bold text-cyan-700">
                              {initials}
                            </div>
                            <span className="font-medium text-slate-800 text-sm">{r.nombre}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {r.empresa?.nombre
                            ? <span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{r.empresa.nombre}</span>
                            : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">{r.email ?? "—"}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 tracking-wide">Activo</span>
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal previsualización */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-6xl flex-col rounded-3xl bg-white shadow-2xl max-h-[95vh]">

            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-8 py-5">
              <h3 className="text-lg font-black text-slate-900">Previsualización de correo</h3>
              <button onClick={() => setShowPreview(false)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50 transition">
                Cerrar
              </button>
            </div>

            <div className="flex-1 overflow-auto px-8 py-6 flex flex-col gap-6">

              {/* Asunto */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Asunto</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)}
                  className="h-11 w-full rounded-xl border border-cyan-200 px-3 text-base text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
              </div>

              {/* Destinatarios */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Para ({selectedCount} destinatario{selectedCount !== 1 ? "s" : ""})
                </label>
                <div className="max-h-28 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  {[
                    ...solicitantes.map((s) => ({ id: s.id_solicitante, nombre: s.nombre, email: s.email ?? null })),
                    ...tecnicos.map((t) => ({ id: -t.id_tecnico, nombre: t.nombre, email: t.email ?? null })),
                  ].filter((c) => selected[c.id]).map((r) => (
                    <div key={r.id}>{r.nombre} &lt;{r.email ?? "—"}&gt;</div>
                  ))}
                </div>
              </div>

              {/* Adjuntos */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Adjuntos</label>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((a, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm">
                      <span>{a.name} ({Math.round(a.size / 1024)} KB)</span>
                      <button onClick={() => setAttachments((cur) => cur.filter((_, i) => i !== idx))} className="font-bold text-red-400 hover:text-red-600">×</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border border-dashed border-cyan-300 px-3 py-1.5 text-xs font-medium text-cyan-600 hover:bg-cyan-50 transition">
                    + Adjuntar archivo
                  </button>
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => onFilesPicked(e.target.files)} />
                </div>
              </div>

              {/* Editor de contenido */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Mensaje</label>
                  <button type="button" onClick={() => setEditHtml((v) => !v)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 transition">
                    {editHtml ? "WYSIWYG" : "HTML"}
                  </button>
                </div>

                {editHtml ? (
                  <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={14}
                    className="w-full rounded-xl border border-cyan-200 px-3 py-2 font-mono text-xs text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
                ) : (
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 shadow-sm">
                      {[
                        { cmd: "bold", title: "Negrita", label: <b>B</b> },
                        { cmd: "italic", title: "Cursiva", label: <i>I</i> },
                        { cmd: "underline", title: "Subrayado", label: <u>U</u> },
                      ].map(({ cmd, title, label }) => (
                        <button key={cmd} type="button" title={title}
                          onMouseDown={(e) => { e.preventDefault(); document.execCommand(cmd); }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-sm text-slate-600 hover:bg-white hover:shadow-sm transition">{label}</button>
                      ))}
                      <div className="mx-1 h-5 border-l border-slate-200" />
                      <button type="button" title="Lista"
                        onMouseDown={(e) => { e.preventDefault(); insertList(false); }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-sm text-slate-600 hover:bg-white hover:shadow-sm transition">•</button>
                      <button type="button" title="Lista numerada"
                        onMouseDown={(e) => { e.preventDefault(); insertList(true); }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-sm text-slate-600 hover:bg-white hover:shadow-sm transition">1.</button>
                      <div className="flex-1" />
                      <button type="button" title="Limpiar formato"
                        onMouseDown={(e) => { e.preventDefault(); document.execCommand("removeFormat"); }}
                        className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-white transition">Limpiar</button>
                    </div>
                    <div
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={() => { if (editorRef.current) setContent(editorRef.current.innerHTML); }}
                      onFocus={() => { isTypingRef.current = true; }}
                      onBlur={() => { isTypingRef.current = false; if (editorRef.current) setContent(editorRef.current.innerHTML); }}
                      className="min-h-[260px] rounded-xl border border-cyan-200 px-4 py-3 text-sm outline-none transition focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-100 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
                    />
                  </div>
                )}
              </div>

              {/* Vista previa con template */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Vista previa del correo</label>
                <div className="overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-8 max-h-[760px]">
                  <div
                    className="mx-auto max-w-[600px] origin-top scale-[1.35] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
                    dangerouslySetInnerHTML={{ __html: fullHtml }}
                  />
                </div>
              </div>
            </div>

            {/* Modal footer — dos botones de envío */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-8 py-5">
              <button onClick={() => setShowPreview(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button
                disabled={isSending}
                onClick={() => { setSendMode("plain"); setShowPreview(false); handleSend("plain"); }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
                title="Envía solo el texto, sin diseño HTML"
              >
                Enviar texto plano
              </button>
              <button
                disabled={isSending}
                onClick={() => { setSendMode("html"); setShowPreview(false); handleSend("html"); }}
                className="rounded-xl bg-cyan-600 px-5 py-2 text-sm font-bold text-white hover:bg-cyan-500 transition disabled:cursor-not-allowed disabled:opacity-60"
                title="Envía con el diseño HTML de marca RIDS"
              >
                {isSending ? "Enviando..." : `Enviar con diseño HTML`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
