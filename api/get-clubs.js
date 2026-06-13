// api/get-clubs.js
// Vercel Serverless Function — lista todos los clubes con conteo de miembros

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!ADMIN_SECRET || req.headers['x-admin-key'] !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/clubs?select=id,name,monthly_amount,admin_email,created_at,club_members(count)&order=created_at.asc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    const data = await r.json();
    if (!Array.isArray(data)) return res.status(500).json({ error: 'Error consultando Supabase' });

    const clubs = data.map(c => ({
      id: c.id,
      name: c.name,
      monthly_amount: c.monthly_amount,
      admin_email: c.admin_email,
      created_at: c.created_at,
      member_count: Array.isArray(c.club_members) ? (c.club_members[0]?.count ?? 0) : 0
    }));

    return res.status(200).json({ clubs });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
