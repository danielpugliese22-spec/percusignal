// api/remove-club-member.js
// Vercel Serverless Function — elimina un miembro de un club

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  if (!ADMIN_SECRET || req.headers['x-admin-key'] !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const { club_id, email } = req.body || {};
    if (!club_id || !email) return res.status(400).json({ error: 'Falta club_id o email' });

    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/club_members?club_id=eq.${encodeURIComponent(club_id)}&email=eq.${encodeURIComponent(email)}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=representation'
        }
      }
    );

    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      return res.status(400).json({ error: data.message || 'Error al eliminar miembro' });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
