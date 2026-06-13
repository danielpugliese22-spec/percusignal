// api/send-premium-invite.js
// Envía invitaciones Premium a todos los usuarios con plan free (máx 200).
// Solo accesible con x-admin-key para disparos manuales desde el panel admin.

import { sendEmail, tplPremiumInvite } from './_email.js';

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
    const sbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?plan=eq.free&select=email&limit=200`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    const users = await sbRes.json();

    if (!Array.isArray(users)) {
      return res.status(500).json({ error: 'Error al consultar usuarios' });
    }

    let sent = 0;
    let errors = 0;

    for (const u of users) {
      try {
        await sendEmail({
          to: u.email,
          subject: '¡Pasate a Premium en PercuSignal!',
          html: tplPremiumInvite({ email: u.email })
        });
        sent++;
      } catch (e) {
        console.error(`[invite] Error for ${u.email}:`, e.message);
        errors++;
      }
    }

    return res.status(200).json({ ok: true, sent, errors, total: users.length });
  } catch (e) {
    console.error('[send-premium-invite] Error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
