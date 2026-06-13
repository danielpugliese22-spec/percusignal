// api/_email.js — helper de envío de emails via Resend

const FROM = 'info@percusignal.com.ar';
const APP_URL = 'https://percusignal.com.ar';

function wrap(content) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0c0c0c;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
<table style="max-width:560px;width:100%;"><tr><td style="padding-bottom:24px;">
<span style="font-size:20px;font-weight:700;color:#e8d5a3;letter-spacing:-0.02em;">PercuSignal</span>
</td></tr><tr><td style="background:#111111;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:28px;">
${content}
</td></tr><tr><td style="padding-top:20px;font-size:11px;color:#7a7671;font-family:'Courier New',monospace;">
&#169; 2026 PercuSignal &middot; <a href="${APP_URL}" style="color:#7a7671;text-decoration:none;">percusignal.com.ar</a>
</td></tr></table>
</td></tr></table></body></html>`;
}

function p(s, color = '#f0ede8', size = '15px', weight = '400', mb = '16px') {
  return `<p style="margin:0 0 ${mb};font-size:${size};color:${color};line-height:1.6;font-weight:${weight};">${s}</p>`;
}

function cta(label, url) {
  return `<a href="${url}" style="display:inline-block;margin-top:4px;padding:11px 22px;background:#e8d5a3;color:#0c0c0c;text-decoration:none;font-weight:700;font-size:14px;border-radius:4px;">${label}</a>`;
}

// Envía un email vía Resend. Retorna { ok, id } o lanza excepción en caso de error HTTP.
export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY no configurado — email omitido');
    return { ok: false, skipped: true };
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html })
  });
  const data = await r.json();
  if (!r.ok) {
    console.error('[email] Resend error:', JSON.stringify(data));
    throw new Error(`Resend error ${r.status}: ${data.message || JSON.stringify(data)}`);
  }
  console.log(`[email] OK: "${subject}" → ${to}`);
  return { ok: true, id: data.id };
}

// --- Templates ---

export function tplWelcomeClubMember({ email, displayName, clubName, clubId }) {
  const name = displayName || email.split('@')[0];
  const clubUrl = `${APP_URL}/club/${encodeURIComponent(clubId || '')}`;
  return wrap(
    p('¡Bienvenido al club!', '#e8d5a3', '20px', '700', '8px') +
    p(`Hola ${name}, fuiste agregado como miembro de <strong style="color:#e8d5a3;">${clubName}</strong>.`) +
    p('Desde ahora podés pagar tu cuota mensual directamente desde la página del club y acceder a la app.') +
    cta('Ver mi club', clubUrl)
  );
}

export function tplClubPaymentToAdmin({ memberEmail, clubName, activeUntil }) {
  const date = new Date(activeUntil).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  return wrap(
    p('Nuevo pago de club recibido', '#e8d5a3', '18px', '700', '8px') +
    p(`<strong style="color:#e8d5a3;">${memberEmail}</strong> pagó la cuota de <strong style="color:#e8d5a3;">${clubName}</strong>.`) +
    p(`Acceso válido hasta el <strong>${date}</strong>.`)
  );
}

export function tplWelcomeNewUser({ email }) {
  const name = email.split('@')[0];
  return wrap(
    p('¡Bienvenido a PercuSignal!', '#e8d5a3', '20px', '700', '8px') +
    p(`Hola ${name}, gracias por registrarte.`) +
    p('PercuSignal es una app de reconocimiento de gestos para percusión. Con el plan gratuito podés explorar la app y, cuando quieras, pasar a Premium para desbloquear todos los instrumentos y compases.') +
    cta('Ir a la app', `${APP_URL}/app`)
  );
}

export function tplPremiumConfirmation({ email, activeUntil }) {
  const name = email.split('@')[0];
  const date = new Date(activeUntil).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  return wrap(
    p('¡Ya sos Premium! 🎉', '#e8d5a3', '20px', '700', '8px') +
    p(`Hola ${name}, tu pago fue procesado correctamente.`) +
    p(`Tu acceso Premium está activo hasta el <strong style="color:#e8d5a3;">${date}</strong>.`) +
    cta('Ir a la app', `${APP_URL}/app`)
  );
}

export function tplPremiumPaymentToAdmin({ email, amount }) {
  return wrap(
    p('Nuevo pago Premium recibido', '#e8d5a3', '18px', '700', '8px') +
    p(`<strong style="color:#e8d5a3;">${email}</strong> completó un pago Premium.`) +
    (amount ? p(`Monto: <strong>$${Number(amount).toLocaleString('es-AR')}</strong>`) : '')
  );
}

export function tplExpiryReminderClub({ email, displayName, clubName, clubId, daysLeft }) {
  const name = displayName || email.split('@')[0];
  const clubUrl = `${APP_URL}/club/${encodeURIComponent(clubId || '')}`;
  return wrap(
    p('Tu cuota vence pronto', '#e8d5a3', '18px', '700', '8px') +
    p(`Hola ${name}, tu cuota del club <strong style="color:#e8d5a3;">${clubName}</strong> vence en <strong>${daysLeft} día${daysLeft !== 1 ? 's' : ''}</strong>.`) +
    p('Para mantener tu acceso, renovála desde la página del club.') +
    cta('Renovar cuota', clubUrl)
  );
}

export function tplExpiryReminderPremium({ email, daysLeft }) {
  const name = email.split('@')[0];
  return wrap(
    p('Tu plan Premium vence pronto', '#e8d5a3', '18px', '700', '8px') +
    p(`Hola ${name}, tu plan Premium vence en <strong>${daysLeft} día${daysLeft !== 1 ? 's' : ''}</strong>.`) +
    p('Para seguir con acceso completo, renovalo desde la landing.') +
    cta('Renovar Premium', APP_URL)
  );
}

export function tplPremiumInvite({ email }) {
  const name = email.split('@')[0];
  return wrap(
    p('¡Pasate a Premium!', '#e8d5a3', '20px', '700', '8px') +
    p(`Hola ${name}, tenemos algo especial para vos.`) +
    p('Con el plan Premium de PercuSignal desbloqueás todos los instrumentos, todos los compases y acceso prioritario a las nuevas funciones.') +
    cta('Ver planes', APP_URL)
  );
}
