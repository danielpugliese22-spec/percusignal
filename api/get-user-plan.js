// api/get-user-plan.js
// Vercel Serverless Function — devuelve el plan del usuario

import { sendEmail, tplWelcomeNewUser } from './_email.js';

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

    // Usuario nuevo: crear registro y enviar bienvenida
    if (!data[0]) {
      try {
        // on_conflict=email + return=representation: si el email ya existía
        // (o si el INSERT falla) no se devuelve fila y NO se manda el mail.
        // Antes el mail salía aunque el INSERT diera 400 → loop de bienvenidas.
        const ins = await fetch(`${SUPABASE_URL}/rest/v1/users?on_conflict=email`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=ignore-duplicates,return=representation'
          },
          body: JSON.stringify({ email, plan: 'free' })
        });
        if (!ins.ok) {
          const detail = await ins.text().catch(() => '');
          console.error('[welcome] INSERT failed:', ins.status, detail);
        } else {
          const rows = await ins.json().catch(() => []);
          const created = Array.isArray(rows) && rows.length > 0;
          if (created && process.env.RESEND_API_KEY) {
            await sendEmail({
              to: email,
              subject: '¡Bienvenido a PercuSignal!',
              html: tplWelcomeNewUser({ email })
            });
          }
        }
      } catch (e) {
        console.error('[welcome] New user error:', e.message);
      }
    }

    const user = data[0] || { plan: 'free', active_until: null };

    if (user.active_until && new Date(user.active_until) < new Date()) {
      user.plan = 'free';
    }

    return res.status(200).json(user);
  } catch (e) {
    return res.status(500).json({ error: e.message, plan: 'free' });
  }
}
