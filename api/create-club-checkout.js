// api/create-club-checkout.js
// Vercel Serverless Function — crea preferencia de pago para cuota de club

const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { club_id, email } = req.body || {};
    if (!club_id || !email) return res.status(400).json({ error: 'Falta club_id o email' });

    // Verificar que el email esté en la lista cerrada del club
    const memberRes = await fetch(
      `${SUPABASE_URL}/rest/v1/club_members?club_id=eq.${encodeURIComponent(club_id)}&email=eq.${encodeURIComponent(email)}&select=id`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const members = await memberRes.json();
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(403).json({ error: 'Este club es privado' });
    }

    // Obtener datos del club
    const clubRes = await fetch(
      `${SUPABASE_URL}/rest/v1/clubs?id=eq.${encodeURIComponent(club_id)}&select=id,name,monthly_amount`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const clubs = await clubRes.json();
    if (!Array.isArray(clubs) || clubs.length === 0) {
      return res.status(404).json({ error: 'Club no encontrado' });
    }
    const club = clubs[0];

    // Crear preferencia en Mercado Pago
    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          title: `${club.name} - Cuota mensual`,
          quantity: 1,
          unit_price: club.monthly_amount,
          currency_id: 'ARS'
        }],
        payer: { email },
        back_urls: {
          success: `https://percusignal.com.ar/club/${club_id}?subscribed=true&email=${encodeURIComponent(email)}`,
          failure: `https://percusignal.com.ar/club/${club_id}?subscribed=false`,
          pending: `https://percusignal.com.ar/club/${club_id}?subscribed=pending`
        },
        auto_return: 'approved',
        external_reference: `${email}|club:${club_id}|30`,
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
