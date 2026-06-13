// api/send-expiry-reminders.js
// Envía recordatorios de vencimiento a miembros de clubs y usuarios Premium.
// Invocado diariamente por Vercel Cron (GET) o manualmente (x-admin-key).

import { sendEmail, tplExpiryReminderClub, tplExpiryReminderPremium } from './_email.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers['authorization'];
  const adminKey = req.headers['x-admin-key'];
  const isCron = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;
  const isAdmin = ADMIN_SECRET && adminKey === ADMIN_SECRET;

  if (!isCron && !isAdmin) {
    return res.status(401).json({ error: 'No autorizado' });
  }

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
    // 1. Miembros de club que vencen en los próximos 3 días
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

    // 2. Usuarios Premium que vencen en los próximos 3 días
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
