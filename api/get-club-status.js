// api/get-club-status.js
// Vercel Serverless Function — estado de pago de un miembro de club

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { club_id, email } = req.query || {};
    if (!club_id || !email) return res.status(400).json({ error: 'Falta club_id o email' });

    const memberRes = await fetch(
      `${SUPABASE_URL}/rest/v1/club_members?club_id=eq.${encodeURIComponent(club_id)}&email=eq.${encodeURIComponent(email)}&select=display_name,active_until`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const members = await memberRes.json();

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(200).json({ member: false });
    }

    const { display_name, active_until } = members[0];
    const now = Date.now();

    if (!active_until) {
      return res.status(200).json({ member: true, status: 'never_paid', display_name, active_until: null, days_left: 0 });
    }

    const expiresAt = new Date(active_until).getTime();
    if (expiresAt <= now) {
      return res.status(200).json({ member: true, status: 'expired', display_name, active_until, days_left: 0 });
    }

    const days_left = Math.ceil((expiresAt - now) / (1000 * 3600 * 24));
    return res.status(200).json({ member: true, status: 'active', display_name, active_until, days_left });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
