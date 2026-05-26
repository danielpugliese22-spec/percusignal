// api/create-subscription.js
// Vercel Serverless Function — crea preferencia de Checkout Pro

const MP_TOKEN = process.env.MP_ACCESS_TOKEN;

const PLANS = {
  premium_monthly: { name: 'PercuSignal Premium - 1 mes',  amount: 8900,  days: 30 },
  premium_yearly:  { name: 'PercuSignal Premium - 1 año',  amount: 79000, days: 365 },
  pro:             { name: 'PercuSignal Pro - 1 mes',      amount: 29000, days: 30 },
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { plan, email } = req.body || {};
    if (!plan || !email) return res.status(400).json({ error: 'Falta plan o email' });

    const planConfig = PLANS[plan];
    if (!planConfig) return res.status(400).json({ error: 'Plan inválido' });

    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          title: planConfig.name,
          quantity: 1,
          unit_price: planConfig.amount,
          currency_id: 'ARS'
        }],
        payer: { email },
        back_urls: {
          success: 'https://percusignal.com.ar/app/?subscribed=true&plan=' + plan,
          failure: 'https://percusignal.com.ar/app/?subscribed=false',
          pending: 'https://percusignal.com.ar/app/?subscribed=pending'
        },
        auto_return: 'approved',
        external_reference: email + '|' + plan + '|' + planConfig.days,
        notification_url: 'https://percusignal.com.ar/api/mp-webhook',
        statement_descriptor: 'PERCUSIGNAL'
      })
    });

    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data.message || 'Error MP', details: data });

    return res.status(200).json({ init_point: data.init_point, id: data.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
