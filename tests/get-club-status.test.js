import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-sb-key';

const { default: handler } = await import('../api/get-club-status.js');

function makeRes() {
  const res = { _status: 200, _body: null };
  res.setHeader = () => res;
  res.status = (s) => { res._status = s; return res; };
  res.json = (b) => { res._body = b; return res; };
  res.end = () => res;
  res.send = (b) => { res._body = b; return res; };
  return res;
}

function makeReq(query = {}) {
  return { method: 'GET', query, headers: {} };
}

describe('get-club-status', () => {
  let fetchMock;

  beforeEach(() => { fetchMock = vi.fn(); global.fetch = fetchMock; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns 400 when params are missing', async () => {
    const res = makeRes();
    await handler(makeReq({}), res);
    expect(res._status).toBe(400);
  });

  it('returns member:false for unknown email', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => [] });
    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm', email: 'unknown@test.com' }), res);
    expect(res._body).toEqual({ member: false });
  });

  it('returns never_paid when active_until is null', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => [{ display_name: 'Juan', active_until: null }]
    });
    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm', email: 'juan@test.com' }), res);
    expect(res._body.member).toBe(true);
    expect(res._body.status).toBe('never_paid');
    expect(res._body.days_left).toBe(0);
  });

  it('returns expired when active_until is in the past', async () => {
    const past = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
    fetchMock.mockResolvedValueOnce({
      json: async () => [{ display_name: 'María', active_until: past }]
    });
    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm', email: 'maria@test.com' }), res);
    expect(res._body.status).toBe('expired');
    expect(res._body.days_left).toBe(0);
  });

  it('returns active with days_left when active_until is in the future', async () => {
    const future = new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString();
    fetchMock.mockResolvedValueOnce({
      json: async () => [{ display_name: 'Pedro', active_until: future }]
    });
    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm', email: 'pedro@test.com' }), res);
    expect(res._body.status).toBe('active');
    expect(res._body.days_left).toBeGreaterThan(0);
    expect(res._body.days_left).toBeLessThanOrEqual(15);
    expect(res._body.member).toBe(true);
  });
});
