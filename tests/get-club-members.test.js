import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-sb-key';
process.env.ADMIN_SECRET = 'secret-test-123';

const { default: handler } = await import('../api/get-club-members.js');

function makeRes() {
  const res = { _status: 200, _body: null };
  res.setHeader = () => res;
  res.status = (s) => { res._status = s; return res; };
  res.json = (b) => { res._body = b; return res; };
  res.end = () => res;
  res.send = (b) => { res._body = b; return res; };
  return res;
}

function makeReq(query = {}, headers = {}) {
  return { method: 'GET', query, headers };
}

const MEMBERS = [
  { email: 'juan@test.com', display_name: 'Juan', active_until: new Date(Date.now() + 10 * 86400000).toISOString(), mp_subscription_id: 'p1', updated_at: new Date().toISOString() },
  { email: 'maria@test.com', display_name: 'María', active_until: new Date(Date.now() - 5 * 86400000).toISOString(), mp_subscription_id: 'p2', updated_at: new Date().toISOString() },
  { email: 'pedro@test.com', display_name: 'Pedro', active_until: null, mp_subscription_id: null, updated_at: new Date().toISOString() },
];

describe('get-club-members', () => {
  let fetchMock;

  beforeEach(() => { fetchMock = vi.fn(); global.fetch = fetchMock; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns 401 when x-admin-key header is missing', async () => {
    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm' }, {}), res);
    expect(res._status).toBe(401);
  });

  it('returns 401 when x-admin-key is wrong', async () => {
    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm' }, { 'x-admin-key': 'wrong-key' }), res);
    expect(res._status).toBe(401);
  });

  it('returns 400 when club_id is missing', async () => {
    const res = makeRes();
    await handler(makeReq({}, { 'x-admin-key': 'secret-test-123' }), res);
    expect(res._status).toBe(400);
  });

  it('returns members array with correct key when authorized', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => MEMBERS });
    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm' }, { 'x-admin-key': 'secret-test-123' }), res);
    expect(res._status).toBe(200);
    expect(Array.isArray(res._body.members)).toBe(true);
    expect(res._body.members).toHaveLength(3);
  });

  it('calculates status correctly for each member', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => MEMBERS });
    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm' }, { 'x-admin-key': 'secret-test-123' }), res);
    const members = res._body.members;
    const juan = members.find(m => m.email === 'juan@test.com');
    const maria = members.find(m => m.email === 'maria@test.com');
    const pedro = members.find(m => m.email === 'pedro@test.com');
    expect(juan.status).toBe('active');
    expect(juan.days_left).toBeGreaterThan(0);
    expect(maria.status).toBe('expired');
    expect(pedro.status).toBe('never_paid');
  });
});
