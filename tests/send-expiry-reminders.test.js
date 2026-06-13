import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-sb-key';
process.env.ADMIN_SECRET = 'secret-test-123';
process.env.CRON_SECRET = 'cron-secret-test';
process.env.RESEND_API_KEY = 'test-resend-key';

const { default: handler } = await import('../api/send-expiry-reminders.js');

function makeRes() {
  const res = { _status: 200, _body: null };
  res.setHeader = () => res;
  res.status = (s) => { res._status = s; return res; };
  res.json = (b) => { res._body = b; return res; };
  res.end = () => res;
  return res;
}

function makeReq(method = 'GET', headers = {}) {
  return { method, headers, body: {}, query: {} };
}

const ADMIN_HEADER = { 'x-admin-key': 'secret-test-123' };
const CRON_HEADER = { 'authorization': 'Bearer cron-secret-test' };

const FUTURE_2D = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();
const FUTURE_1D = new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString();

describe('send-expiry-reminders — auth', () => {
  let fetchMock;
  beforeEach(() => { fetchMock = vi.fn(); global.fetch = fetchMock; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns 401 without auth header', async () => {
    const res = makeRes();
    await handler(makeReq('GET', {}), res);
    expect(res._status).toBe(401);
  });

  it('returns 401 with wrong admin key', async () => {
    const res = makeRes();
    await handler(makeReq('GET', { 'x-admin-key': 'wrong' }), res);
    expect(res._status).toBe(401);
  });

  it('returns 405 for DELETE method', async () => {
    const res = makeRes();
    await handler(makeReq('DELETE', ADMIN_HEADER), res);
    expect(res._status).toBe(405);
  });

  it('accepts x-admin-key auth', async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => [] }) // club_members
      .mockResolvedValueOnce({ json: async () => [] }); // users

    const res = makeRes();
    await handler(makeReq('GET', ADMIN_HEADER), res);
    expect(res._status).toBe(200);
  });

  it('accepts Vercel cron Authorization header', async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce({ json: async () => [] });

    const res = makeRes();
    await handler(makeReq('GET', CRON_HEADER), res);
    expect(res._status).toBe(200);
  });
});

describe('send-expiry-reminders — lógica', () => {
  let fetchMock;
  beforeEach(() => { fetchMock = vi.fn(); global.fetch = fetchMock; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('queries club_members with date range filter', async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce({ json: async () => [] });

    const res = makeRes();
    await handler(makeReq('GET', ADMIN_HEADER), res);

    const clubCall = fetchMock.mock.calls[0];
    expect(clubCall[0]).toContain('/rest/v1/club_members');
    expect(clubCall[0]).toContain('active_until=gte.');
    expect(clubCall[0]).toContain('active_until=lte.');
    expect(clubCall[0]).toContain('clubs(name,id)');
  });

  it('queries premium users with date range filter', async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce({ json: async () => [] });

    const res = makeRes();
    await handler(makeReq('GET', ADMIN_HEADER), res);

    const userCall = fetchMock.mock.calls[1];
    expect(userCall[0]).toContain('/rest/v1/users');
    expect(userCall[0]).toContain('plan=eq.premium');
  });

  it('returns 0 reminders when no members are expiring', async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce({ json: async () => [] });

    const res = makeRes();
    await handler(makeReq('GET', ADMIN_HEADER), res);

    expect(res._body.ok).toBe(true);
    expect(res._body.club_reminders).toBe(0);
    expect(res._body.premium_reminders).toBe(0);
  });

  it('sends reminder email for each expiring club member', async () => {
    const members = [
      { email: 'a@test.com', display_name: 'Ana', active_until: FUTURE_2D, club_id: 'qlpm', clubs: { name: 'Mi Club', id: 'qlpm' } },
      { email: 'b@test.com', display_name: null, active_until: FUTURE_1D, club_id: 'qlpm', clubs: { name: 'Mi Club', id: 'qlpm' } }
    ];

    // Orden real: club_members → Resend(Ana) → Resend(b) → premium_users
    fetchMock
      .mockResolvedValueOnce({ json: async () => members }) // call[0]: club_members
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e1' }) }) // call[1]: Resend Ana
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e2' }) }) // call[2]: Resend b@test.com
      .mockResolvedValueOnce({ json: async () => [] }); // call[3]: premium users

    const res = makeRes();
    await handler(makeReq('GET', ADMIN_HEADER), res);

    expect(res._body.club_reminders).toBe(2);
    expect(res._body.premium_reminders).toBe(0);

    const resendAna = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(resendAna.to).toBe('a@test.com');
    expect(resendAna.html).toContain('Ana');
    expect(resendAna.html).toContain('Mi Club');
  });

  it('sends reminder email for each expiring Premium user', async () => {
    const premiumUsers = [
      { email: 'premium1@test.com', active_until: FUTURE_2D },
      { email: 'premium2@test.com', active_until: FUTURE_1D }
    ];

    fetchMock
      .mockResolvedValueOnce({ json: async () => [] }) // club_members vacío
      .mockResolvedValueOnce({ json: async () => premiumUsers })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e2' }) });

    const res = makeRes();
    await handler(makeReq('GET', ADMIN_HEADER), res);

    expect(res._body.premium_reminders).toBe(2);
    expect(res._body.club_reminders).toBe(0);

    const resend1 = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(resend1.to).toBe('premium1@test.com');
    expect(resend1.html).toContain('Premium');
  });

  it('counts errors gracefully when individual email send fails', async () => {
    const members = [
      { email: 'ok@test.com', display_name: null, active_until: FUTURE_2D, club_id: 'x', clubs: { name: 'Club', id: 'x' } },
      { email: 'fail@test.com', display_name: null, active_until: FUTURE_1D, club_id: 'x', clubs: { name: 'Club', id: 'x' } }
    ];

    // Orden real: club_members → Resend(ok) → Resend(fail, rechazado) → premium_users
    fetchMock
      .mockResolvedValueOnce({ json: async () => members }) // call[0]: club_members
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e1' }) }) // call[1]: Resend ok@test.com → éxito
      .mockRejectedValueOnce(new Error('Resend error')) // call[2]: Resend fail@test.com → falla
      .mockResolvedValueOnce({ json: async () => [] }); // call[3]: premium users

    const res = makeRes();
    await handler(makeReq('GET', ADMIN_HEADER), res);

    // Solo 1 éxito, el fallo es ignorado (no interrumpe el loop)
    expect(res._body.club_reminders).toBe(1);
    expect(res._status).toBe(200);
  });
});

describe('send-expiry-reminders POST — invitaciones Premium', () => {
  let fetchMock;
  beforeEach(() => { fetchMock = vi.fn(); global.fetch = fetchMock; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns 401 without x-admin-key on POST', async () => {
    const res = makeRes();
    await handler(makeReq('POST', {}), res);
    expect(res._status).toBe(401);
  });

  it('returns 401 if only cron auth is used for POST (requires x-admin-key)', async () => {
    const res = makeRes();
    await handler(makeReq('POST', CRON_HEADER), res);
    expect(res._status).toBe(401);
  });

  it('queries Supabase for free users with limit 200', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => [] });

    const res = makeRes();
    await handler(makeReq('POST', ADMIN_HEADER), res);

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toContain('/rest/v1/users');
    expect(call[0]).toContain('plan=eq.free');
    expect(call[0]).toContain('limit=200');
  });

  it('returns 0 sent when no free users', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => [] });

    const res = makeRes();
    await handler(makeReq('POST', ADMIN_HEADER), res);

    expect(res._body.ok).toBe(true);
    expect(res._body.sent).toBe(0);
    expect(res._body.total).toBe(0);
  });

  it('sends one invite email per free user', async () => {
    const users = [{ email: 'free1@test.com' }, { email: 'free2@test.com' }];

    fetchMock
      .mockResolvedValueOnce({ json: async () => users })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e2' }) });

    const res = makeRes();
    await handler(makeReq('POST', ADMIN_HEADER), res);

    expect(res._body.sent).toBe(2);
    expect(res._body.errors).toBe(0);

    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.to).toBe('free1@test.com');
    expect(body.from).toBe('info@percusignal.com.ar');
    expect(body.subject).toContain('Premium');
  });

  it('counts errors and continues when individual invite email fails', async () => {
    const users = [{ email: 'ok@test.com' }, { email: 'fail@test.com' }];

    fetchMock
      .mockResolvedValueOnce({ json: async () => users })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e1' }) })
      .mockRejectedValueOnce(new Error('Resend down'));

    const res = makeRes();
    await handler(makeReq('POST', ADMIN_HEADER), res);

    expect(res._body.sent).toBe(1);
    expect(res._body.errors).toBe(1);
    expect(res._status).toBe(200);
  });
});
