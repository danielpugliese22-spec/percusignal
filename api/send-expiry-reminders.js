// api/send-expiry-reminders.js
// GET  (CRON_SECRET o x-admin-key): envía recordatorios de vencimiento (club + Premium)
// POST (x-admin-key): envía invitaciones Premium a todos los usuarios free

import { sendEmail, tplExpiryReminderClub, tplExpiryReminderPremium, tplPremiumInvite } from './_email.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const CRON_SECRET = process.env.CRON_SECRET;

function isAuthorized(req) {
  const isCron = CRON_SECRET && req.headers['authorization'] === `Bearer ${CRON_SECRET}`;
  const isAdmin = ADMIN_SECRET && req.headers['x-admin-key'] === ADMIN_SECRET;
  return isCron || isAdmin;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  // POST → invitaciones Premium a usuarios free
  if (req.method === 'POST') {
    // POST solo acepta x-admin-key (no cron)
    if (!ADMIN_SECRET || req.headers['x-admin-key'] !== ADMIN_SECRET) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    return handlePremiumInvite(res);
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // GET → recordatorios de vencimiento
  return handleExpiryReminders(res);
}

async function handleExpiryReminders(res) {
  const sbHeaders = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  const now = new Date();
  const todayStr = now.toISOString();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 3600 * 1000).toISOString();

  let clubReminders = 0;
  let premiumReminders = 0;

  try {
    // 1. Miembros de club con vencimiento en los próximos 3 días
    const clubRes = await fetch(
      `${SUPABASE_URL}/rest/v1/club_members?active_until=gte.${encodeURIComponent(todayStr)}&active_until=lte.${encodeURIComponent(threeDaysLater)}&select=email,display_name,active_until,club_id,clubs(name,id)`,
      { headers: sbHeaders }
    );
    const clubMembers = await clubRes.json();

    if (Array.isArray(clubMembers)) {
      for (const m of clubMembers) {
        const daysLeft = Math.max(1, Math.ceil((new Date(m.active_until) - now) / (24 * 3600 * 1000)));
        const clubName = m.clubs?.name || m.club_id;
        try {
          await sendEmail({
            to: m.email,
            subject: `Tu cuota de ${clubName} vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
            html: tplExpiryReminderClub({ email: m.email, displayName: m.display_name, clubName, clubId: m.club_id, daysLeft })
          });
          clubReminders++;
        } catch (e) {
          console.error(`[expiry] Club reminder error for ${m.email}:`, e.message);
        }
      }
    }

    // 2. Usuarios Premium con vencimiento en los próximos 3 días
    const userRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?plan=eq.premium&active_until=gte.${encodeURIComponent(todayStr)}&active_until=lte.${encodeURIComponent(threeDaysLater)}&select=email,active_until`,
      { headers: sbHeaders }
    );
    const premiumUsers = await userRes.json();

    if (Array.isArray(premiumUsers)) {
      for (const u of premiumUsers) {
        const daysLeft = Math.max(1, Math.ceil((new Date(u.active_until) - now) / (24 * 3600 * 1000)));
        try {
          await sendEmail({
            to: u.email,
            subject: `Tu plan Premium vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
            html: tplExpiryReminderPremium({ email: u.email, daysLeft })
          });
          premiumReminders++;
        } catch (e) {
          console.error(`[expiry] Premium reminder error for ${u.email}:`, e.message);
        }
      }
    }

    return res.status(200).json({ ok: true, club_reminders: clubReminders, premium_reminders: premiumReminders });
  } catch (e) {
    console.error('[send-expiry-reminders] Error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}

async function handlePremiumInvite(res) {
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
