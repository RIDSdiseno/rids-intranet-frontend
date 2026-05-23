import React, { useEffect, useState } from 'react';
import { Modal, Input, Button, notification, Checkbox, Spin } from 'antd';
import { FilePdfOutlined, PaperClipOutlined } from '@ant-design/icons';
import type { DetalleTrabajoGestioo } from './types';
import { http } from '../../service/http';
import { generarOrdenPDF } from './pdf';

const { TextArea } = Input;

interface Props {
  show: boolean;
  onClose: () => void;
  orden: DetalleTrabajoGestioo | null;
}

const SendOrdenModal: React.FC<Props> = ({ show, onClose, orden }) => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('Orden de Trabajo desde RIDS');
  const [bodyHtml, setBodyHtml] = useState('');
  const [usePlainText, setUsePlainText] = useState(false);
  const [plainText, setPlainText] = useState('');
  const [plainEdited, setPlainEdited] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ name: string; contentType: string; contentBytes: string }>>([]);
  const [sending, setSending] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    if (orden) {
      setTo(orden.entidad?.correo ?? '');
      setSubject(`Orden #${orden.id} - ${orden.entidad?.nombre ?? ''}`);
      const defHtml = buildDefaultHtml(orden);
      setBodyHtml(defHtml);
      setPlainText(buildDefaultPlainText(orden));
      setPlainEdited(false);
      setAttachments([]);
    }
  }, [orden]);

  useEffect(() => {
    // No auto-generar el PDF al abrir el modal (evita OOM).
    // El PDF se genera bajo demanda al presionar "Generar PDF y adjuntar" o al enviar si falta el adjunto.
  }, [show, orden]);

  const blobToDataUrl = (blob: Blob) => new Promise<string>((res) => {
    const r = new FileReader(); r.onloadend = () => res(r.result as string); r.readAsDataURL(blob);
  });

  const generateAndAttachPdf = async () => {
    if (!orden) return null;
    const filename = `Orden_${orden.ordenGrupoId ?? orden.id}.pdf`;
    try {
      setGeneratingPdf(true);
      const pdf = await generarOrdenPDF(orden);
      let dataUrl: string | null = null;
      try { dataUrl = pdf.output('datauristring'); } catch (e) {
        try { const blob = pdf.output('blob'); dataUrl = await blobToDataUrl(blob); } catch (err) { console.error(err); }
      }
      if (!dataUrl) {
        notification.error({ message: 'Error', description: 'No se pudo generar el PDF.' });
        return null;
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
      notification.success({ message: 'PDF adjuntado', description: 'La orden fue generada y adjuntada al correo.' });
      return attachment;
    } catch (err) {
      console.error('Error generating order pdf', err);
      notification.error({ message: 'Error', description: 'Fallo al generar el PDF.' });
      return null;
    } finally {
      setGeneratingPdf(false);
    }
  };

  const embedLogoInHtml = async (html: string) => {
    try {
      if (!html || !html.includes('/img/splash.png')) return html;
      const resp = await fetch('/img/splash.png');
      if (!resp.ok) return html;
      const blob = await resp.blob();
      const dataUrl = await blobToDataUrl(blob);
      return html.replace(/src=["']\/img\/splash\.png["']/g, `src="${dataUrl}"`);
    } catch (e) { return html; }
  };

  const handleSend = async () => {
    if (!orden) return;
    const dest = to || orden.entidad?.correo || '';
    if (!dest) { notification.warning({ message: 'Sin destinatario', description: 'Indica un correo destino.' }); return; }

    setSending(true);
    try {
      const generated = attachments.find(a => a.name.includes(`Orden_${orden.id}`)) ?? await generateAndAttachPdf();
      let finalHtml = usePlainText ? buildHtmlFromText(plainText) : bodyHtml;
      finalHtml = await embedLogoInHtml(finalHtml);

      const payload = { targets: [{ email: dest, nombre: orden.entidad?.nombre || '' }], subject, bodyHtml: finalHtml, attachments: generated ? [generated] : [] };
      const { data } = await http.post('/correo/enviar-masivo', payload);
      if (data?.ok) {
        notification.success({ message: 'Correo en cola', description: `Orden enviada a ${dest}` });
        onClose();
      } else {
        notification.error({ message: 'Error', description: String(data?.message ?? 'Respuesta inválida') });
      }
    } catch (err: any) {
      console.error('Send error', err);
      notification.error({ message: 'Error al enviar', description: err?.message ?? String(err) });
    } finally { setSending(false); }
  };

  const handleClose = () => { setAttachments([]); setShowPreviewModal(false); onClose(); };

  return (
    <>
      <Modal open={show} onCancel={handleClose} title={null} footer={null} width={720}>
        <div style={{ background: '#0891b2', color: '#fff', padding: '14px 18px', borderTopLeftRadius: 4, borderTopRightRadius: 4 }}>
          <div className="flex items-center gap-3">
            <div style={{ background: '#fff', padding: '6px 10px', borderRadius: 8 }}>
              <img src="/img/splash.png" alt="RIDS" style={{ height: 34 }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Enviar orden de trabajo</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Adjuntar y enviar por correo</div>
            </div>
          </div>
        </div>

        <div style={{ padding: 18 }}>
          {!orden ? (<div>No hay orden seleccionada</div>) : (
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
                    <Checkbox checked={usePlainText} onChange={(e) => { const checked = e.target.checked; setUsePlainText(checked); if (checked && (!plainText || plainText.trim() === '')) setPlainText(buildDefaultPlainText(orden)); }}>Texto plano</Checkbox>
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
                <Button icon={<FilePdfOutlined />} onClick={() => { setGeneratingPdf(true); generateAndAttachPdf().finally(() => setGeneratingPdf(false)); }}>Generar PDF y adjuntar</Button>
                <Button icon={<PaperClipOutlined />} onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.pdf'; input.onchange = async () => { const f = input.files?.[0]; if (!f) return; const reader = new FileReader(); reader.onloadend = () => { const dataUrl = reader.result as string; const comma = dataUrl.indexOf(','); const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl; setAttachments([{ name: f.name, contentType: f.type || 'application/pdf', contentBytes: base64 }]); notification.success({ message: 'Adjunto', description: `${f.name} adjuntado.` }); }; reader.readAsDataURL(f); }; input.click(); }}>Adjuntar PDF</Button>
              </div>

              {attachments.length > 0 && (
                <div className="rounded-md border p-3 bg-gray-50">
                  <div className="text-sm text-slate-600">Adjuntos</div>
                  <ul className="mt-2 text-sm">{attachments.map((a, i) => (<li key={i}>{a.name}</li>))}</ul>
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

      <Modal open={showPreviewModal} onCancel={() => setShowPreviewModal(false)} footer={null} title="Previsualización del mensaje" width={720}>
        <div dangerouslySetInnerHTML={{ __html: usePlainText ? buildHtmlFromText(plainText) : bodyHtml }} />
      </Modal>
    </>
  );
};

function buildHtmlFromText(text: string) {
  const safe = String(text || '').replace(/\n/g, '<br/>');
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <div style="background:#0891b2;padding:18px;border-radius:6px 6px 0 0;text-align:center;color:#fff;">
        <img src="/img/splash.png" alt="RIDS" style="height:36px;display:inline-block;margin-bottom:6px;"/>
        <div style="font-size:14px;margin-top:6px;">Orden de Trabajo</div>
      </div>
      <div style="padding:18px;background:#fff;border:1px solid #e6eef0;border-top:0;border-radius:0 0 6px 6px;">
        <div style="max-width:700px;margin:0 auto;font-size:14px;line-height:1.45;">
          ${safe}
          <p>Saludos cordiales,<br/>Equipo RIDS</p>
        </div>
      </div>
    </div>`;
}

function buildDefaultPlainText(orden: DetalleTrabajoGestioo) {
  return `Estimado/a ${orden.entidad?.nombre ?? ''},\n\nAdjunto encontrará la orden de trabajo #${orden.id}. Puede descargar el PDF adjunto y responder a este correo para coordinar el servicio.\n\nResumen:\n- Orden: #${orden.id}\n- Servicio: ${orden.tipoTrabajo ?? '-'}\n- Marca: ${orden.equipo?.marca ?? '-'}\n- Modelo: ${orden.equipo?.modelo ?? '-'}\n- Número Serial: ${orden.equipo?.serial ?? '-'}\n\nSaludos cordiales,\nEquipo RIDS`;
}

function htmlToPlain(html: string) {
  try {
    const tmp = document.createElement('div'); tmp.innerHTML = html || ''; const text = tmp.textContent || tmp.innerText || ''; return text.replace(/\s+/g, ' ').trim();
  } catch (e) { return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }
}

function buildDefaultHtml(orden: DetalleTrabajoGestioo) {
  const codigo = `#${orden.id}`;
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="background:#0891b2;padding:20px;border-radius:8px 8px 0 0;text-align:center;color:#fff;">
      <img src="/img/splash.png" alt="RIDS" style="height:56px;display:block;margin:0 auto 6px;" />
      <div style="font-size:16px;margin-top:4px;opacity:0.95">Orden de Trabajo</div>
    </div>
    <div style="background:#fff;border:1px solid #e6eef0;padding:22px;border-top:0;border-radius:0 0 8px 8px;max-width:760px;margin:0 auto;">
      <p style="margin:0 0 12px;font-size:14px;">Estimado/a ${orden.entidad?.nombre ?? ''},</p>
      <p style="margin:0 0 16px;font-size:14px;">Adjunto encontrará la orden de trabajo ${codigo}. Puede descargar el PDF adjunto y responder a este correo para coordinar el servicio.</p>

      <div style="background:#f1f7fa;border-left:4px solid #06a6c4;padding:14px;border-radius:6px;margin-bottom:18px;">
        <div style="font-weight:700;margin-bottom:6px;">Resumen:</div>
        <ul style="margin:0;padding-left:18px;color:#0f172a">
          <li style="margin-bottom:6px;">Orden: <strong>${codigo}</strong></li>
          <li style="margin-bottom:6px;">Servicio: <strong>${orden.tipoTrabajo ?? '-'}</strong></li>
          <li style="margin-bottom:6px;">Marca: ${orden.equipo?.marca ?? '-'}</li>
          <li style="margin-bottom:6px;">Modelo: ${orden.equipo?.modelo ?? '-'}</li>
          <li style="margin-bottom:6px;">Número Serial: ${orden.equipo?.serial ?? '-'}</li>
        </ul>
      </div>

      <p style="margin:0 0 6px;font-size:14px;">Saludos cordiales,<br/>Equipo RIDS</p>
      <p style="margin-top:10px;font-size:12px;color:#9ca3af;">Este correo contiene información comercial y un PDF adjunto con la orden.</p>
    </div>
  </div>`;
}

export default SendOrdenModal;
