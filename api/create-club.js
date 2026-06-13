// api/create-club.js
// Vercel Serverless Function — crea un club nuevo

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!ADMIN_SECRET || req.headers['x-admin-key'] !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const { id, name, monthly_amount, admin_email } = req.body || {};
    if (!id || !name || !monthly_amount || !admin_email) {
      return res.status(400).json({ error: 'Faltan campos: id, name, monthly_amount, admin_email' });
    }

    const amount = parseInt(monthly_amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'monthly_amount debe ser un número positivo' });
    }

    const r = await fetch(`${SUPABASE_URL}/rest/v1/clubs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ id, name, monthly_amount: amount, admin_email })
    });

    const data = await r.json();
    if (!r.ok) return res.status(400).json({ error: data.message || data.details || 'Error al crear club' });

    return res.status(201).json(Array.isArray(data) ? data[0] : data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
