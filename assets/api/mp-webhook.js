// api/mp-webhook.js
// Vercel Serverless Function — recibe notificaciones de MP

const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  console.log('=== WEBHOOK CALLED ===');
  console.log('Method:', req.method);
  console.log('Query:', JSON.stringify(req.query));
  console.log('Body:', JSON.stringify(req.body));

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
  const plan = ref[1] || 'premium_monthly';
  const days = parseInt(ref[2]) || 30;

  if (!email) return res.status(200).send('no email');

  const planType = plan.includes('pro') ? 'pro' : 'premium';
  const activeUntil = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();

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
  return res.status(200).send('OK');
}
