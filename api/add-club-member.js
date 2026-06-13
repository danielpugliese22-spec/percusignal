// api/add-club-member.js
// Vercel Serverless Function — agrega un miembro a un club

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
    const { club_id, email, display_name } = req.body || {};
    if (!club_id || !email) return res.status(400).json({ error: 'Falta club_id o email' });

    const r = await fetch(`${SUPABASE_URL}/rest/v1/club_members`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        club_id,
        email,
        display_name: display_name || null,
        updated_at: new Date().toISOString()
      })
    });

    const data = await r.json();
    if (!r.ok) return res.status(400).json({ error: data.message || data.details || 'Error al agregar miembro' });

    return res.status(201).json(Array.isArray(data) ? data[0] : data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
