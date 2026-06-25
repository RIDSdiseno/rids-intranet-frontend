import React, { useEffect, useRef, useState } from 'react';
import { Modal, Input, Button, notification, Checkbox, Spin } from 'antd';
import { PaperClipOutlined, FilePdfOutlined, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import type { CotizacionGestioo } from './types';
import { http } from '../../service/http';
import GenerarPDFModal, { generarPDF } from './GenerarPDFModal';
import { buildCotizacionHtml, buildCotizacionPlainText, escapeHtml, formatCurrency } from '../../lib/emailTemplates';

const { TextArea } = Input;

interface Props {
  show: boolean;
  onClose: () => void;
  cotizacion: CotizacionGestioo | null;
}

export default function SendCotizacionModal({ show, onClose, cotizacion }: Props) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('Adjunto cotización desde RIDS');
  const [bodyHtml, setBodyHtml] = useState('<p>Adjuntamos la cotización solicitada.</p>');
  const [usePlainText, setUsePlainText] = useState(true);
  const [plainText, setPlainText] = useState('');
  const [plainEdited, setPlainEdited] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ name: string; contentType: string; contentBytes: string }>>([]);
  const [sending, setSending] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const pendingPdfResolver = useRef<((v?: unknown) => void) | null>(null);

  useEffect(() => {
    if (cotizacion) {
      setTo(cotizacion.entidad?.correo ?? '');
      setSubject(`Cotización #${cotizacion.id} - ${cotizacion.entidad?.nombre ?? ''}`);
      setBodyHtml(buildCotizacionHtml(cotizacion));
      setPlainText(buildCotizacionPlainText(cotizacion));
      setPlainEdited(false);
      setAttachments([]);
      const init = (cotizacion.entidad?.correo ?? '').trim();
      if (init) {
        const { invalid } = validateEmails(init);
        setEmailError(invalid ? `Dirección inválida: ${invalid}` : null);
      } else setEmailError(null);
    }
  }, [cotizacion]);

  useEffect(() => {
    if (show && cotizacion) {
      setGeneratingPdf(true);
      const t = setTimeout(() => {
        generateAndAttachPdf().catch(e => console.error('Auto-generate PDF failed', e)).finally(() => setGeneratingPdf(false));
      }, 60);
      return () => clearTimeout(t);
    } else {
      setGeneratingPdf(false);
    }
  }, [show, cotizacion]);

  const onGeneratedPreview = async (url: string) => {
    try {
      if (typeof url === 'string' && url.startsWith('data:')) {
        const dataUrl = url as string;
        const comma = dataUrl.indexOf(',');
        const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
        const mimeMatch = dataUrl.match(/data:([^;]+);/);
        const contentType = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const filename = `Cotizacion_${cotizacion?.id || '0'}.pdf`;
        setAttachments((cur) => {
          const others = cur.filter(a => a.name !== filename);
          return [...others, { name: filename, contentType, contentBytes: base64 }];
        });
        notification.success({ message: 'PDF adjuntado', description: 'El PDF generado fue adjuntado al correo.' });
        if (pendingPdfResolver.current) { pendingPdfResolver.current(true); pendingPdfResolver.current = null; }
        return;
      }

      let resp: Response;
      try { resp = await fetch(url); } catch (fetchErr) { console.error('Error fetching generated PDF URL:', fetchErr, url); notification.error({ message: 'Error', description: 'No se pudo obtener el PDF generado (fetch falló).' }); if (pendingPdfResolver.current) pendingPdfResolver.current = null; return; }
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const dataUrl = reader.result as string;
          const comma = dataUrl.indexOf(',');
          const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
          const filename = `Cotizacion_${cotizacion?.id || '0'}.pdf`;
          setAttachments((cur) => {
            const others = cur.filter(a => a.name !== filename);
            return [...others, { name: filename, contentType: blob.type || 'application/pdf', contentBytes: base64 }];
          });
          notification.success({ message: 'PDF adjuntado', description: 'El PDF generado fue adjuntado al correo.' });
          if (pendingPdfResolver.current) { pendingPdfResolver.current(true); pendingPdfResolver.current = null; }
        } catch (err) { console.error('Error processing generated PDF blob:', err); notification.error({ message: 'Error', description: 'Error procesando el PDF generado.' }); }
      };
      reader.readAsDataURL(blob);
    } catch (e) { console.error('Error attaching generated PDF', e); notification.error({ message: 'Error', description: 'No se pudo adjuntar el PDF generado.' }); } finally { setShowGenerator(false); }
  };

  const embedLogoInHtml = async (html: string) => {
    try {
      if (!html || !html.includes('/img/splash.png')) return html;
      const resp = await fetch('/img/splash.png');
      if (!resp.ok) return html;
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((res) => { const r = new FileReader(); r.onloadend = () => res(r.result as string); r.readAsDataURL(blob); });
      return html.replace(/src=["']\/img\/splash\.png["']/g, `src="${dataUrl}"`);
    } catch (e) { console.error('embedLogoInHtml error', e); return html; }
  };

  const generateAndAttachPdf = async (): Promise<{ name: string; contentType: string; contentBytes: string } | null> => {
    if (!cotizacion) return null;
    const filename = `Cotizacion_${cotizacion?.id || '0'}.pdf`;
    const existing = attachments.find(a => a.name === filename);
    if (existing) return existing;

    try {
      const pdf = await generarPDF(cotizacion, false, true);
      let dataUrl: string | null = null;
      try { dataUrl = pdf.output('datauristring'); } catch (e) { try { const blob = pdf.output('blob'); dataUrl = await new Promise<string>((res) => { const r = new FileReader(); r.onloadend = () => res(r.result as string); r.readAsDataURL(blob); }); } catch (err) { console.error('No se pudo obtener dataURI del pdf', err); } }
      if (!dataUrl) { notification.error({ message: 'Error', description: 'No se pudo generar el PDF.' }); return null; }
      const comma = dataUrl.indexOf(',');
      const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
      const mimeMatch = dataUrl.match(/data:([^;]+);/);
      const contentType = mimeMatch ? mimeMatch[1] : 'application/pdf';
      const attachment = { name: filename, contentType, contentBytes: base64 };
      setAttachments((cur) => { const others = cur.filter(a => a.name !== filename); return [...others, attachment]; });
      notification.success({ message: 'PDF adjuntado', description: 'El PDF fue generado y adjuntado automáticamente.' });
      return attachment;
    } catch (err) { console.error('Error generando PDF programático', err); notification.error({ message: 'Error', description: 'Fallo al generar el PDF.' }); }
    return null;
  };

  function validateEmails(raw: string): { dests: string[]; invalid: string | null } {
    const r = String(raw || '').trim();
    if (!r) return { dests: [], invalid: null };
    const dests = r.split(/[;,\s]+/).map(s => s.trim()).filter(Boolean);
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = dests.find(d => !re.test(d)) ?? null;
    return { dests, invalid };
  }

  const handleSend = async () => {
    if (!cotizacion) return;
    const raw = (to || cotizacion.entidad?.correo || '').trim();
    if (!raw) {
      const msg = 'La cotización no tiene correo registrado.';
      Modal.error({ title: 'Sin destinatario', content: msg });
      notification.error({ message: 'Sin destinatario', description: msg });
      return;
    }

    const { dests, invalid } = validateEmails(raw);
    if (invalid) {
      const msg = `Dirección inválida: ${invalid}`;
      Modal.error({ title: 'Correo inválido', content: msg });
      notification.error({ message: 'Correo inválido', description: msg });
      setEmailError(msg);
      return;
    }

    setSending(true);
    try {
      const generated = await generateAndAttachPdf();
      const finalAttachments = [...attachments];
      if (generated && !finalAttachments.find(a => a.name === generated.name)) finalAttachments.push(generated);
      let finalHtml = usePlainText ? buildHtmlFromText(plainText) : bodyHtml;
      finalHtml = await embedLogoInHtml(finalHtml);

      const payload = { targets: dests.map(d => ({ email: d, nombre: cotizacion.entidad?.nombre || '' })), subject, bodyHtml: finalHtml, attachments: finalAttachments };
      const { data } = await http.post('/correo/enviar-masivo', payload);
      if (data?.ok || data?.queued || data?.jobId) {
        const queued = !!data?.queued;
        const sucMsg = queued
          ? `El correo fue puesto en cola y será enviado en breve a: ${dests.join(', ')}`
          : `La cotización fue enviada correctamente a: ${dests.join(', ')}`;

        try { window.dispatchEvent(new CustomEvent('cotizacion:enviada', { detail: { cotizacionId: cotizacion?.id ?? null, to: dests.join(', '), jobId: data.jobId ?? null } })); } catch (e) {}

        (async () => {
          try {
            let currentUserName: string | null = null;
            try { const rawU = localStorage.getItem('user'); if (rawU) currentUserName = JSON.parse(rawU)?.nombre ?? JSON.parse(rawU)?.name ?? null; } catch (_) { currentUserName = null; }
            await http.post('/cotizaciones/enviadas', {
              cotizacionId: cotizacion?.id ?? null,
              to: dests.join(', '),
              subject,
              jobId: data.jobId ?? null,
              sentBy: currentUserName,
              meta: { attachments: finalAttachments.length },
              clienteNombre: cotizacion?.entidad?.nombre ?? null,
              creadoPor: cotizacion?.tecnico?.nombre ?? null,
              fechaCreacion: (cotizacion as any)?.fecha ?? (cotizacion as any)?.createdAt ?? null,
            });
          } catch (err: any) {
            console.error('Error registrando cotizacion enviada:', err);
          }
        })();

        setSendResult({ type: 'success', title: queued ? 'Envío en cola' : '¡Cotización enviada!', message: sucMsg });
      } else {
        const msg = String(data?.message ?? 'Respuesta inválida del servidor');
        setSendResult({ type: 'error', title: 'Error al enviar', message: msg });
      }
    } catch (err: any) {
      console.error('Send error', err);
      const msg = err?.response?.data?.error ?? err?.message ?? String(err);
      setSendResult({ type: 'error', title: 'No se pudo enviar', message: String(msg) });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => { setAttachments([]); setShowGenerator(false); setShowPreviewModal(false); onClose(); };

  return (
    <>
      <Modal open={show} onCancel={handleClose} title={null} footer={null} width={700} maskClosable={false} keyboard={false}>
        <div style={{ background: '#0891b2', color: '#fff', padding: '14px 18px', borderTopLeftRadius: 4, borderTopRightRadius: 4 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{ background: '#ffffff', padding: '6px 10px', borderRadius: 8, display: 'inline-block' }}>
                <img src="/img/splash.png" alt="RIDS" style={{ height: 34, objectFit: 'contain', display: 'block' }} />
              </div>
              <div>
                <div className="text-lg font-semibold">Enviar cotización</div>
                <div className="text-sm opacity-90">Adjuntar y enviar por correo</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: 18 }}>
          {!cotizacion ? (<div>No hay cotización seleccionada</div>) : (
            <div className="space-y-4">
              {generatingPdf && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                  <div style={{ textAlign: 'center' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 10 }}>Generando PDF, por favor espere...</div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-600">Para</label>
                <Input value={to} onChange={(e) => { const v = e.target.value; setTo(v); const { invalid } = validateEmails(v); setEmailError(invalid ? `Dirección inválida: ${invalid}` : null); }} className={`mt-1 ${emailError ? 'border-red-500' : ''}`} />
                {emailError && <div className="text-xs text-red-600 mt-1">{emailError}</div>}
              </div>

              <div>
                <label className="block text-sm text-slate-600">Asunto</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm text-slate-600">Mensaje</label>
                  <div className="flex items-center gap-3">
                    <Checkbox checked={usePlainText} onChange={(e) => { const checked = e.target.checked; setUsePlainText(checked); if (checked && (!plainText || plainText.trim() === '')) setPlainText(buildDefaultPlainText(cotizacion as CotizacionGestioo)); }}>Texto plano</Checkbox>
                    <Button size="small" onClick={() => setShowPreviewModal(true)}>Previsualizar</Button>
                  </div>
                </div>

                {!usePlainText ? (
                  <div className="mt-2">
                    <label className="text-xs text-slate-500">HTML</label>
                    <TextArea value={bodyHtml} onChange={(e) => { const v = e.target.value; setBodyHtml(v); if (!plainEdited) setPlainText(htmlToPlain(v)); }} rows={6} />
                  </div>
                ) : (
                  <div className="mt-2">
                    <label className="text-xs text-slate-500">Texto</label>
                    <TextArea value={plainText} onChange={(e) => { setPlainText(e.target.value); setPlainEdited(true); }} rows={6} />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button icon={<FilePdfOutlined />} onClick={() => setShowGenerator(true)}>Generar PDF y adjuntar</Button>
                <Button icon={<PaperClipOutlined />} onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.pdf'; input.onchange = async () => { const f = input.files?.[0]; if (!f) return; const reader = new FileReader(); reader.onloadend = () => { const dataUrl = reader.result as string; const comma = dataUrl.indexOf(','); const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl; setAttachments([{ name: f.name, contentType: f.type || 'application/pdf', contentBytes: base64 }]); notification.success({ message: 'Adjunto', description: `${f.name} adjuntado.` }); }; reader.readAsDataURL(f); }; input.click(); }}>Adjuntar PDF</Button>
              </div>

              {attachments.length > 0 && (
                <div className="rounded-md border p-3 bg-gray-50">
                  <div className="text-sm text-slate-600">Adjuntos</div>
                  <ul className="mt-2 text-sm">
                    {attachments.map((a, i) => (
                      <li key={i}>{a.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button onClick={handleClose}>Cancelar</Button>
                <Button type="primary" loading={sending} onClick={handleSend} disabled={!!emailError || sending}>Enviar</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <GenerarPDFModal show={showGenerator} onClose={() => setShowGenerator(false)} cotizacion={cotizacion} onPreviewPDF={onGeneratedPreview} />

      <Modal open={showPreviewModal} onCancel={() => setShowPreviewModal(false)} footer={null} title="Previsualización del mensaje" width={720}>
        <div dangerouslySetInnerHTML={{ __html: usePlainText ? buildHtmlFromText(plainText) : bodyHtml }} />
      </Modal>

      {/* Modal de resultado de envío */}
      <Modal
        open={!!sendResult}
        onCancel={() => { setSendResult(null); if (sendResult?.type === 'success') onClose(); }}
        footer={null}
        closable={false}
        centered
        width={420}
        maskClosable={false}
      >
        {sendResult && (
          <div className="flex flex-col items-center gap-4 py-6 px-4 text-center">
            {sendResult.type === 'success' ? (
              <CheckCircleFilled style={{ fontSize: 56, color: '#10b981' }} />
            ) : (
              <CloseCircleFilled style={{ fontSize: 56, color: '#ef4444' }} />
            )}
            <div>
              <p className="text-lg font-bold text-slate-900 mb-1">{sendResult.title}</p>
              <p className="text-sm text-slate-500 leading-relaxed">{sendResult.message}</p>
            </div>
            <button
              onClick={() => { setSendResult(null); if (sendResult.type === 'success') onClose(); }}
              className={`mt-2 w-full rounded-xl py-2.5 text-sm font-bold text-white transition ${
                sendResult.type === 'success'
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {sendResult.type === 'success' ? 'Entendido' : 'Cerrar'}
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}

function buildHtmlFromText(text: string) {
  const safe = String(text || '').replace(/\n/g, '<br/>');
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <div style="background:#0891b2;padding:18px;border-radius:6px 6px 0 0;text-align:center;color:#fff;">
        <img src="/img/splash.png" alt="RIDS" style="height:30px;display:inline-block;margin-bottom:6px;"/>
        <div style="font-size:14px;margin-top:6px;">Cotización</div>
      </div>
      <div style="padding:18px;background:#fff;border:1px solid #e6eef0;border-top:0;border-radius:0 0 6px 6px;">
        <div style="max-width:700px;margin:0 auto;font-size:14px;line-height:1.45;word-break:break-word;white-space:normal;overflow-wrap:anywhere;">
          ${safe}
        </div>
      </div>
    </div>`;
}

// Plain text template moved to src/lib/emailTemplates.buildCotizacionPlainText

function htmlToPlain(html: string) {
  try {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    const text = tmp.textContent || tmp.innerText || '';
    return text.replace(/\s+/g, ' ').trim();
  } catch (e) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

// HTML template moved to src/lib/emailTemplates.buildCotizacionHtml

// formatCurrency provided by src/lib/emailTemplates
