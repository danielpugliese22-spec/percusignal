// api/mp-webhook.js
// Vercel Serverless Function — recibe notificaciones de MP con verificación de firma

import crypto from 'crypto';
import { sendEmail, tplClubPaymentToAdmin, tplPremiumConfirmation, tplPremiumPaymentToAdmin } from './_email.js';

const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET; // ← agregar en Vercel env vars
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Verifica que el webhook venga realmente de MercadoPago (HMAC-SHA256)
// Docs: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
function verifyMpSignature(req) {
  // Si no hay secret configurado, skipear (modo dev/testing)
  if (!MP_WEBHOOK_SECRET) {
    console.warn('[WEBHOOK] MP_WEBHOOK_SECRET no configurado - firma no verificada (modo dev)');
    return true;
  }

  try {
    const signature = req.headers['x-signature'];
    const requestId = req.headers['x-request-id'];

    if (!signature || !requestId) {
      console.warn('[WEBHOOK] Falta header x-signature o x-request-id');
      return false;
    }

    // El header x-signature viene como: ts=1234567890,v1=abc123hash
    const parts = signature.split(',');
    const tsPart = parts.find(p => p.trim().startsWith('ts='));
    const v1Part = parts.find(p => p.trim().startsWith('v1='));

    if (!tsPart || !v1Part) {
      console.warn('[WEBHOOK] Formato de firma inválido:', signature);
      return false;
    }

    const ts = tsPart.split('=')[1].trim();
    const expectedHash = v1Part.split('=')[1].trim();

    // Construir manifest según docs MP:
    // id:{data.id};request-id:{x-request-id};ts:{ts};
    const dataId = String(req.query['data.id'] || req.query.id || '').toLowerCase();
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

    const computedHash = crypto
      .createHmac('sha256', MP_WEBHOOK_SECRET)
      .update(manifest)
      .digest('hex');

    const valid = computedHash === expectedHash;
    if (!valid) {
      console.warn('[WEBHOOK] Firma inválida', { manifest, computedHash, expectedHash });
    }
    return valid;
  } catch (e) {
    console.error('[WEBHOOK] Error verificando firma:', e.message);
    return false;
  }
}

export default async function handler(req, res) {
  console.log('=== WEBHOOK CALLED ===');
  console.log('Method:', req.method);
  console.log('Query:', JSON.stringify(req.query));
  console.log('Body:', JSON.stringify(req.body));

  // ── Verificar firma ANTES de procesar ──
  if (!verifyMpSignature(req)) {
    console.error('[WEBHOOK] Firma rechazada - posible intento de fraude');
    return res.status(401).send('Invalid signature');
  }
  console.log('[WEBHOOK] Firma verificada ✓');

  try {
    const params = req.query || {};
    const body = req.body || {};

    const topic = params.topic || params.type || body.type;
    const id = params.id || body?.data?.id || body.resource;

    if (!id) return res.status(200).send('no id');

    if (topic === 'merchant_order') {
      const orderRes = await fetch(`https://api.mercadopago.com/merchant_orders/${id}`, {
        headers: { 'Authorization': `Bearer ${MP_TOKEN}` }
      });
      const order = await orderRes.json();
      const approved = (order.payments || []).find(p => p.status === 'approved');
      if (!approved) return res.status(200).send('no approved payment');
      return await processPayment(approved.id, res);
    }

    if (topic === 'payment') {
      return await processPayment(id, res);
    }

    return res.status(200).send('topic ignored');
  } catch (e) {
    console.error('WEBHOOK FATAL:', e.message);
    return res.status(200).send('error: ' + e.message);
  }
}

async function processPayment(paymentId, res) {
  const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${MP_TOKEN}` }
  });
  const payment = await paymentRes.json();

  console.log('Payment status:', payment.status);
  console.log('external_reference:', payment.external_reference);

  if (payment.status !== 'approved') return res.status(200).send('not approved');

  const ref = (payment.external_reference || '').split('|');
  const email = ref[0] || payment.payer?.email;
  const planOrClub = ref[1] || 'premium_monthly';
  const days = parseInt(ref[2]) || 30;

  if (!email) return res.status(200).send('no email');

  const activeUntil = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();

  // Pago de cuota de club → actualizar club_members Y otorgar Premium en users
  if (planOrClub.startsWith('club:')) {
    const clubId = planOrClub.replace('club:', '');
    const sbHeaders = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'PercuSignal-Webhook/1.0',
      'Prefer': 'resolution=merge-duplicates,return=representation'
    };
    const payerData = {
      mp_payer_id: String(payment.payer?.id || ''),
      mp_subscription_id: String(payment.id),
      active_until: activeUntil,
      updated_at: new Date().toISOString()
    };

    const sbClubRes = await fetch(`${SUPABASE_URL}/rest/v1/club_members`, {
      method: 'POST', headers: sbHeaders,
      body: JSON.stringify({ club_id: clubId, email, ...payerData })
    });
    console.log('Club member update:', sbClubRes.status);

    const sbUserRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST', headers: sbHeaders,
      body: JSON.stringify({ email, plan: 'premium', ...payerData })
    });
    console.log('User premium update (club):', sbUserRes.status);

    // Notificar al admin del club sobre el pago
    if (process.env.RESEND_API_KEY) {
      try {
        const clubRes = await fetch(
          `${SUPABASE_URL}/rest/v1/clubs?id=eq.${encodeURIComponent(clubId)}&select=name,admin_email`,
          { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        const [club] = await clubRes.json();
        if (club?.admin_email) {
          await sendEmail({
            to: club.admin_email,
            subject: `Nuevo pago: ${email} — ${club.name}`,
            html: tplClubPaymentToAdmin({ memberEmail: email, clubName: club.name, activeUntil })
          });
        }
      } catch (e) {
        console.error('[email] Club admin notify error:', e.message);
      }
    }

    return res.status(200).send('OK - club');
  }

  // Pago de plan Premium/Pro → escribir en users (comportamiento existente)
  const plan = planOrClub;
  const planType = plan.includes('pro') ? 'pro' : 'premium';

  const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'PercuSignal-Webhook/1.0',
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify({
      email,
      plan: planType,
      mp_payer_id: String(payment.payer?.id || ''),
      mp_subscription_id: String(payment.id),
      active_until: activeUntil,
      updated_at: new Date().toISOString()
    })
  });

  console.log('Supabase response:', sbRes.status);

  // Confirmar al usuario y notificar al admin general
  if (process.env.RESEND_API_KEY) {
    try {
      await sendEmail({
        to: email,
        subject: '¡Ya sos Premium en PercuSignal! ✅',
        html: tplPremiumConfirmation({ email, activeUntil })
      });
    } catch (e) {
      console.error('[email] Premium confirm error:', e.message);
    }
    try {
      await sendEmail({
        to: 'danielpugliese22@gmail.com',
        subject: `Nuevo pago Premium: ${email}`,
        html: tplPremiumPaymentToAdmin({ email, amount: payment.transaction_amount })
      });
    } catch (e) {
      console.error('[email] Premium admin notify error:', e.message);
    }
  }

  return res.status(200).send('OK');
}
