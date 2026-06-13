import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-sb-key';
process.env.ADMIN_SECRET = 'secret-test-123';

const { default: handler } = await import('../api/get-clubs.js');

function makeRes() {
  const res = { _status: 200, _body: null };
  res.setHeader = () => res;
  res.status = (s) => { res._status = s; return res; };
  res.json = (b) => { res._body = b; return res; };
  res.end = () => res;
  return res;
}

function makeReq(headers = {}) {
  return { method: 'GET', query: {}, headers };
}

const SUPABASE_CLUBS = [
  { id: 'qlpm', name: 'Qué le pasa a María?', monthly_amount: 2500, admin_email: 'admin@test.com', created_at: '2026-06-01T00:00:00Z', club_members: [{ count: 10 }] },
  { id: 'otro', name: 'Otro Club', monthly_amount: 3000, admin_email: 'otro@test.com', created_at: '2026-06-10T00:00:00Z', club_members: [{ count: 0 }] },
];

describe('get-clubs', () => {
  let fetchMock;
  beforeEach(() => { fetchMock = vi.fn(); global.fetch = fetchMock; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns 401 without x-admin-key', async () => {
    const res = makeRes();
    await handler(makeReq({}), res);
    expect(res._status).toBe(401);
  });

  it('returns 401 with wrong key', async () => {
    const res = makeRes();
    await handler(makeReq({ 'x-admin-key': 'wrong' }), res);
    expect(res._status).toBe(401);
  });

  it('returns clubs array with member_count on success', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => SUPABASE_CLUBS });

    const res = makeRes();
    await handler(makeReq({ 'x-admin-key': 'secret-test-123' }), res);

    expect(res._status).toBe(200);
    expect(Array.isArray(res._body.clubs)).toBe(true);
    expect(res._body.clubs).toHaveLength(2);
  });

  it('maps member_count correctly from embedded count', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => SUPABASE_CLUBS });

    const res = makeRes();
    await handler(makeReq({ 'x-admin-key': 'secret-test-123' }), res);

    const qlpm = res._body.clubs.find(c => c.id === 'qlpm');
    expect(qlpm.member_count).toBe(10);
    const otro = res._body.clubs.find(c => c.id === 'otro');
    expect(otro.member_count).toBe(0);
  });

  it('requests embedded club_members count from Supabase', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => [] });

    const res = makeRes();
    await handler(makeReq({ 'x-admin-key': 'secret-test-123' }), res);

    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain('/rest/v1/clubs');
    expect(url).toContain('club_members(count)');
  });
});
