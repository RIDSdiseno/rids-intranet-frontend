import type { CotizacionGestioo } from '../components/modals-cotizaciones/types';

export function escapeHtml(value?: string | number | null) {
  if (value === null || typeof value === 'undefined') return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatCurrency(n: number) {
  try { return `$${Math.round(n).toLocaleString('es-CL')}`; } catch (e) { return `$${n}`; }
}

export function buildCotizacionHtml(cot: CotizacionGestioo) {
  const total = Array.isArray(cot.items) ? cot.items.reduce((s: number, it: any) => s + ((Number(it.precio) || 0) * (Number(it.cantidad) || 1)), 0) : cot.total || 0;
  const itemsCount = Array.isArray(cot.items) ? cot.items.length : 0;
  const codigo = `#${cot.id}`;
  const nombre = cot.entidad?.nombre || '';

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#eef2f7;padding:32px 16px;">
    <div style="max-width:600px;margin:0 auto;">

      <!-- Cabecera con marca -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0c4a6e;border-radius:12px 12px 0 0;overflow:hidden;">
        <tr>
          <td style="padding:20px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <img src="/img/splash.png" alt="RIDS" style="height:36px;display:block;border-radius:5px;background:#ffffff;padding:4px;" />
                </td>
                <td align="right">
                  <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Cotización</span>
                  <span style="display:block;font-size:13px;font-weight:600;color:#7dd3fc;margin-top:2px;text-align:right;">${codigo}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Banda de acento -->
        <tr>
          <td style="background:linear-gradient(90deg,#0ea5e9,#38bdf8);height:4px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
      </table>

      <!-- Cuerpo -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
        <tr>
          <td style="padding:28px 28px 20px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#0ea5e9;text-transform:uppercase;letter-spacing:0.08em;">Nueva cotización</p>
            <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#0f172a;">Estimado/a ${escapeHtml(nombre)},</p>
            <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.7;">Adjuntamos la cotización solicitada. En el archivo adjunto encontrarás el detalle completo. Si deseas realizar cambios, responde a este correo indicando lo que necesitas modificar.</p>

            <!-- Tarjetas de resumen -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
              <tr>
                <td width="47%" style="background:#f0f9ff;border-radius:10px;padding:16px 18px;vertical-align:top;">
                  <div style="font-size:10px;font-weight:700;color:#0ea5e9;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Total</div>
                  <div style="font-size:24px;font-weight:800;color:#0c4a6e;line-height:1;">${formatCurrency(total)}</div>
                </td>
                <td width="6%"></td>
                <td width="47%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;vertical-align:top;">
                  <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Ítems incluidos</div>
                  <div style="font-size:24px;font-weight:800;color:#0f172a;line-height:1;">${itemsCount}</div>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>

      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;border-top:1px solid #e2e8f0;border-radius:0 0 12px 12px;">
        <tr>
          <td style="padding:18px 28px;">
            <p style="margin:0 0 4px;font-size:13px;color:#334155;">Saludos cordiales,</p>
            <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#0c4a6e;">Equipo RIDS</p>
            <p style="margin:0;font-size:11px;color:#94a3b8;">Si no solicitaste esta cotización, puedes ignorar este mensaje. Para asistencia, responde a este correo.</p>
          </td>
        </tr>
      </table>

    </div>
  </div>`;
}

export function buildCotizacionPlainText(cot: CotizacionGestioo) {
  const total = Array.isArray(cot.items) ? cot.items.reduce((s: number, it: any) => s + ((Number(it.precio) || 0) * (Number(it.cantidad) || 1)), 0) : cot.total || 0;
  const nombre = cot.entidad?.nombre || '';
  return `Hola ${nombre}\n\nAdjuntamos la cotización solicitada (ID: ${cot.id}).\nTotal: ${formatCurrency(total)}\n\nSaludos,\nEquipo RIDS`;
}
