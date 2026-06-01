// api/get-user-plan.js
// Vercel Serverless Function — devuelve el plan del usuario

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'Falta email' });

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=plan,active_until`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'User-Agent': 'PercuSignal-API/1.0'
        }
      }
    );

    const data = await r.json();
    const user = data[0] || { plan: 'free', active_until: null };

    if (user.active_until && new Date(user.active_until) < new Date()) {
      user.plan = 'free';
    }

    return res.status(200).json(user);
  } catch (e) {
    return res.status(500).json({ error: e.message, plan: 'free' });
  }
}
