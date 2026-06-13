// api/get-club-members.js
// Vercel Serverless Function — lista de miembros para el panel admin

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

function calcStatus(active_until) {
  if (!active_until) return { status: 'never_paid', days_left: 0 };
  const expiresAt = new Date(active_until).getTime();
  const now = Date.now();
  if (expiresAt <= now) return { status: 'expired', days_left: 0 };
  return { status: 'active', days_left: Math.ceil((expiresAt - now) / (1000 * 3600 * 24)) };
}

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
    const { club_id } = req.query || {};
    if (!club_id) return res.status(400).json({ error: 'Falta club_id' });

    const membersRes = await fetch(
      `${SUPABASE_URL}/rest/v1/club_members?club_id=eq.${encodeURIComponent(club_id)}&select=email,display_name,active_until,mp_subscription_id,updated_at&order=display_name.asc`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const members = await membersRes.json();

    if (!Array.isArray(members)) {
      return res.status(500).json({ error: 'Error consultando Supabase' });
    }

    const result = members.map(m => ({
      ...m,
      ...calcStatus(m.active_until)
    }));

    return res.status(200).json({ members: result });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
