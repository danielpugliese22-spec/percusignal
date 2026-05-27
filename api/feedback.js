// api/feedback.js
// Vercel Serverless Function — guarda feedback en Supabase

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    
    // Validación básica
    if(!body.confuse && !body.feature && !body.pay && !body.rating) {
      return res.status(400).json({ error: 'Empty feedback' });
    }

    // Guardar en Supabase tabla feedback
    const supabaseRes = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'PercuSignal-Feedback/1.0',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        email: body.email || null,
        confuse_text: body.confuse || null,
        feature_text: body.feature || null,
        pay_text: body.pay || null,
        rating: body.rating || null,
        plan: body.plan || 'free',
        user_agent: body.userAgent || null,
        created_at: new Date().toISOString()
      })
    });

    if (!supabaseRes.ok) {
      const errText = await supabaseRes.text();
      console.error('Supabase feedback failed:', errText);
      return res.status(500).json({ error: 'DB error', details: errText });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Feedback error:', e);
    return res.status(500).json({ error: e.message });
  }
}
