import React, { useEffect, useRef, useState } from 'react';
import { Modal, Input, Button, notification, Checkbox, Spin } from 'antd';
import { MailOutlined, PaperClipOutlined, FilePdfOutlined } from '@ant-design/icons';
import type { CotizacionGestioo } from './types';
import { http } from '../../service/http';
import GenerarPDFModal, { generarPDF } from './GenerarPDFModal';

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
  const [usePlainText, setUsePlainText] = useState(false);
  const [plainText, setPlainText] = useState('');
  const [plainEdited, setPlainEdited] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ name: string; contentType: string; contentBytes: string }>>([]);
  const [sending, setSending] = useState(false);
  const pendingPdfResolver = useRef<((v?: unknown) => void) | null>(null);

  useEffect(() => {
    if (cotizacion) {
      setTo(cotizacion.entidad?.correo ?? '');
      setSubject(`Cotización #${cotizacion.id} - ${cotizacion.entidad?.nombre ?? ''}`);
      setBodyHtml(buildDefaultHtml(cotizacion));
      setPlainText(buildDefaultPlainText(cotizacion));
      setPlainEdited(false);
    }
  }, [cotizacion]);

  // Auto-generate PDF when modal opens if not yet attached
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    if (show && cotizacion) {
      // Reset attachments when opening modal to avoid leftover files
      setAttachments([]);
      // defer generation slightly so modal can render
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
      // If we receive a data: URI (preferred), extract base64 directly
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
        if (pendingPdfResolver.current) {
          pendingPdfResolver.current(true);
          pendingPdfResolver.current = null;
        }
        return;
      }

      // Otherwise try fetching the URL (blob: URLs). Catch fetch errors separately for clearer diagnostics.
      let resp: Response;
      try {
        resp = await fetch(url);
      } catch (fetchErr) {
        console.error('Error fetching generated PDF URL:', fetchErr, url);
        notification.error({ message: 'Error', description: 'No se pudo obtener el PDF generado (fetch falló).' });
        if (pendingPdfResolver.current) pendingPdfResolver.current = null;
        return;
      }

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
          if (pendingPdfResolver.current) {
            pendingPdfResolver.current(true);
            pendingPdfResolver.current = null;
          }
        } catch (err) {
          console.error('Error processing generated PDF blob:', err);
          notification.error({ message: 'Error', description: 'Error procesando el PDF generado.' });
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error('Error attaching generated PDF', e);
      notification.error({ message: 'Error', description: 'No se pudo adjuntar el PDF generado.' });
    } finally {
      setShowGenerator(false);
    }
  };

  const embedLogoInHtml = async (html: string) => {
    try {
      if (!html || !html.includes('/img/splash.png')) return html;
      const resp = await fetch('/img/splash.png');
      if (!resp.ok) return html;
      const blob = await resp.blob();
      const dataUrl = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onloadend = () => res(r.result as string);
        r.readAsDataURL(blob);
      });
      return html.replace(/src=["']\/img\/splash\.png["']/g, `src="${dataUrl}"`);
    } catch (e) {
      console.error('embedLogoInHtml error', e);
      return html;
    }
  };

  const generateAndAttachPdf = async (): Promise<{ name: string; contentType: string; contentBytes: string } | null> => {
    if (!cotizacion) return null;
    const filename = `Cotizacion_${cotizacion?.id || '0'}.pdf`;
    const existing = attachments.find(a => a.name === filename);
    if (existing) return existing;

    try {
      // Generate PDF programmatically (no UI needed)
      const pdf = await generarPDF(cotizacion, false, true);
      // Prefer data URI
      let dataUrl: string | null = null;
      try {
        dataUrl = pdf.output('datauristring');
      } catch (e) {
        try {
          const blob = pdf.output('blob');
          dataUrl = await new Promise<string>((res) => {
            const r = new FileReader();
            r.onloadend = () => res(r.result as string);
            r.readAsDataURL(blob);
          });
        } catch (err) {
          console.error('No se pudo obtener dataURI del pdf', err);
        }
      }

      if (!dataUrl) {
        notification.error({ message: 'Error', description: 'No se pudo generar el PDF.' });
        return;
      }

      const comma = dataUrl.indexOf(',');
      const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
      const mimeMatch = dataUrl.match(/data:([^;]+);/);
      const contentType = mimeMatch ? mimeMatch[1] : 'application/pdf';

      const attachment = { name: filename, contentType, contentBytes: base64 };
      setAttachments((cur) => {
        const others = cur.filter(a => a.name !== filename);
        return [...others, attachment];
      });
      notification.success({ message: 'PDF adjuntado', description: 'El PDF fue generado y adjuntado automáticamente.' });
      return attachment;
    } catch (err) {
      console.error('Error generando PDF programático', err);
      notification.error({ message: 'Error', description: 'Fallo al generar el PDF.' });
    }
    return null;
  };

  const handleSend = async () => {
    if (!cotizacion) return;
    const dest = to || cotizacion.entidad?.correo || '';
    if (!dest) {
      notification.warning({ message: 'Sin destinatario', description: 'La cotización no tiene correo registrado.' });
      return;
    }

    setSending(true);
    try {
      // ensure PDF is attached and get the attachment
      const generated = await generateAndAttachPdf();

      // build final attachments array synchronously for payload
      const finalAttachments = [...attachments];
      if (generated && !finalAttachments.find(a => a.name === generated.name)) {
        finalAttachments.push(generated);
      }

      let finalHtml = usePlainText ? buildHtmlFromText(plainText) : bodyHtml;
      finalHtml = await embedLogoInHtml(finalHtml);

      const payload = { targets: [{ email: dest, nombre: cotizacion.entidad?.nombre || '' }], subject, bodyHtml: finalHtml, attachments: finalAttachments };
      const { data } = await http.post('/correo/enviar-masivo', payload);
      if (data?.ok) {
        notification.success({ message: 'Correo enviado', description: `Cotización enviada a ${dest}` });
        onClose();
      } else {
        notification.error({ message: 'Error', description: String(data?.message ?? 'Respuesta inválida') });
      }
    } catch (err: any) {
      console.error('Send error', err);
      notification.error({ message: 'Error al enviar', description: err?.message ?? String(err) });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    // clear any generated attachments when modal is closed without sending
    setAttachments([]);
    setShowGenerator(false);
    setShowPreviewModal(false);
    onClose();
  };

  return (
    <>
      <Modal open={show} onCancel={handleClose} title={null} footer={null} width={700}>
        {/* Header acorde a Mailer */}
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
              <Input value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" />
            </div>

            <div>
              <label className="block text-sm text-slate-600">Asunto</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm text-slate-600">Mensaje</label>
                <div className="flex items-center gap-3">
                  <Checkbox checked={usePlainText} onChange={(e) => {
                    const checked = e.target.checked;
                    setUsePlainText(checked);
                    if (checked && (!plainText || plainText.trim() === '')) {
                      setPlainText(buildDefaultPlainText(cotizacion as CotizacionGestioo));
                    }
                  }}>Texto plano</Checkbox>
                  <Button size="small" onClick={() => setShowPreviewModal(true)}>Previsualizar</Button>
                </div>
              </div>

                  {!usePlainText ? (
                <div className="mt-2">
                  <label className="text-xs text-slate-500">HTML</label>
                  <TextArea value={bodyHtml} onChange={(e) => {
                    const v = e.target.value;
                    setBodyHtml(v);
                    // sync to plainText unless user already edited plain text manually
                    if (!plainEdited) {
                      setPlainText(htmlToPlain(v));
                    }
                  }} rows={6} />
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
              <Button icon={<PaperClipOutlined />} onClick={() => {
                // open file picker
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf';
                input.onchange = async () => {
                  const f = input.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const dataUrl = reader.result as string;
                    const comma = dataUrl.indexOf(',');
                    const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
                    setAttachments([{ name: f.name, contentType: f.type || 'application/pdf', contentBytes: base64 }]);
                    notification.success({ message: 'Adjunto', description: `${f.name} adjuntado.` });
                  };
                  reader.readAsDataURL(f);
                };
                input.click();
              }}>Adjuntar PDF</Button>
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
              <Button type="primary" loading={sending} onClick={handleSend}>Enviar</Button>
            </div>
          </div>
        )}
        </div>
      </Modal>

      <GenerarPDFModal show={showGenerator} onClose={() => setShowGenerator(false)} cotizacion={cotizacion} onPreviewPDF={onGeneratedPreview} />

      <Modal open={showPreviewModal} onCancel={() => setShowPreviewModal(false)} footer={null} title="Previsualización del mensaje" width={720}>
        <div dangerouslySetInnerHTML={{ __html: usePlainText ? buildHtmlFromText(plainText) : bodyHtml }} />
      </Modal>
    </>
  );
}

function buildHtmlFromText(text: string) {
  const safe = String(text || '').replace(/\n/g, '<br/>');
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <div style="background:#0891b2;padding:18px;border-radius:6px 6px 0 0;text-align:center;color:#fff;">
        <img src="/img/splash.png" alt="RIDS" style="height:36px;display:inline-block;margin-bottom:6px;"/>
        <div style="font-size:14px;margin-top:6px;">Cotización</div>
      </div>
      <div style="padding:18px;background:#fff;border:1px solid #e6eef0;border-top:0;border-radius:0 0 6px 6px;">
        <div style="max-width:700px;margin:0 auto;font-size:14px;line-height:1.45;">
          ${safe}
          <p>Saludos cordiales,<br/>Equipo RIDS</p>
        </div>
      </div>
    </div>`;
}

function buildDefaultPlainText(cot: CotizacionGestioo) {
  const total = Array.isArray(cot.items)
    ? cot.items.reduce((s: number, it: any) => s + ((Number(it.precio) || 0) * (Number(it.cantidad) || 1)), 0)
    : 0;
  const itemsCount = Array.isArray(cot.items) ? cot.items.length : 0;
  return `Estimado/a ${cot.entidad?.nombre ?? ''},\n\nAdjuntamos la cotización solicitada (ID: ${cot.id}).\n\nEn el archivo PDF adjuntado, encontrará el detalle, que podrá revisar antes de su confirmación o corrección.\n\nResumen:\n- Cotización: #${cot.id}\n- Total: ${formatCurrency(total)}\n- Items: ${itemsCount}\n\nSaludos cordiales,\nEquipo RIDS`;
}

function htmlToPlain(html: string) {
  try {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    const text = tmp.textContent || tmp.innerText || '';
    // normalize whitespace
    return text.replace(/\s+/g, ' ').trim();
  } catch (e) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

function buildDefaultHtml(cot: CotizacionGestioo) {
  const total = Array.isArray(cot.items)
    ? cot.items.reduce((s: number, it: any) => s + ((Number(it.precio) || 0) * (Number(it.cantidad) || 1)), 0)
    : 0;
  const itemsCount = Array.isArray(cot.items) ? cot.items.length : 0;
  const codigo = `#${cot.id}`;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="background:#0891b2;padding:20px;border-radius:8px 8px 0 0;text-align:center;color:#fff;">
      <img src="/img/splash.png" alt="RIDS" style="height:46px;display:block;margin:0 auto 6px;" />
      <div style="font-size:16px;margin-top:4px;opacity:0.95">Cotización</div>
    </div>
    <div style="background:#fff;border:1px solid #e6eef0;padding:22px;border-top:0;border-radius:0 0 8px 8px;max-width:760px;margin:0 auto;">
      <p style="margin:0 0 12px;font-size:14px;">Estimado/a ${cot.entidad?.nombre ?? ''},</p>
      <p style="margin:0 0 16px;font-size:14px;">Adjuntamos la cotización solicitada (ID: ${cot.id}).</p>
      <p style="margin:0 0 16px;font-size:14px;">En el archivo PDF adjuntado, encontrará el detalle, que podrá revisar antes de su confirmación o corrección.</p>

      <div style="background:#f1f7fa;border-left:4px solid #06a6c4;padding:14px;border-radius:6px;margin-bottom:18px;">
        <div style="font-weight:700;margin-bottom:6px;">Resumen:</div>
        <ul style="margin:0;padding-left:18px;color:#0f172a">
          <li style="margin-bottom:6px;">Cotización: <strong>${codigo}</strong></li>
          <li style="margin-bottom:6px;">Total: <strong>${formatCurrency(total)}</strong></li>
          <li style="margin-bottom:6px;">Items: ${itemsCount}</li>
        </ul>
      </div>

      <p style="margin:0 0 6px;font-size:14px;">Saludos cordiales,<br/>Equipo RIDS</p>
      <p style="margin-top:10px;font-size:12px;color:#9ca3af;">Este correo contiene información comercial y un PDF adjunto con la cotización.</p>
    </div>
  </div>`;
}

function formatCurrency(n: number) {
  try {
    return `$${Math.round(n).toLocaleString('es-CL')}`;
  } catch (e) {
    return `$${n}`;
  }
}
