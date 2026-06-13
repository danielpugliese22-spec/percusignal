import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Setup env vars before importing the handler
process.env.MP_ACCESS_TOKEN = 'test-mp-token';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-sb-key';

const { default: handler } = await import('../api/create-club-checkout.js');

function makeRes() {
  const res = { _status: 200, _body: null };
  res.setHeader = () => res;
  res.status = (s) => { res._status = s; return res; };
  res.json = (b) => { res._body = b; return res; };
  res.end = () => res;
  res.send = (b) => { res._body = b; return res; };
  return res;
}

function makeReq(method, body = {}) {
  return { method, body, headers: {} };
}

describe('create-club-checkout', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('returns 405 for non-POST methods', async () => {
    const res = makeRes();
    await handler(makeReq('GET'), res);
    expect(res._status).toBe(405);
  });

  it('returns 400 when club_id or email is missing', async () => {
    const res = makeRes();
    await handler(makeReq('POST', { club_id: 'qlpm' }), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/Falta/);
  });

  it('returns 403 when email is not in club_members', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => [] }); // club_members empty
    const res = makeRes();
    await handler(makeReq('POST', { club_id: 'qlpm', email: 'outsider@test.com' }), res);
    expect(res._status).toBe(403);
    expect(res._body.error).toBe('Este club es privado');
  });

  it('returns 404 when club does not exist', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => [{ id: '1' }] }); // member exists
    fetchMock.mockResolvedValueOnce({ json: async () => [] }); // club empty
    const res = makeRes();
    await handler(makeReq('POST', { club_id: 'ghost', email: 'member@test.com' }), res);
    expect(res._status).toBe(404);
  });

  it('returns init_point when member exists and MP succeeds', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => [{ id: '1' }] }); // member
    fetchMock.mockResolvedValueOnce({ json: async () => [{ id: 'qlpm', name: 'Qué le pasa a María?', monthly_amount: 2500 }] }); // club
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ init_point: 'https://mp.com/checkout/123', id: 'pref_123' })
    }); // MP
    const res = makeRes();
    await handler(makeReq('POST', { club_id: 'qlpm', email: 'member@test.com' }), res);
    expect(res._status).toBe(200);
    expect(res._body.init_point).toBe('https://mp.com/checkout/123');
  });

  it('sends correct external_reference to MP', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => [{ id: '1' }] });
    fetchMock.mockResolvedValueOnce({ json: async () => [{ id: 'qlpm', name: 'Test Club', monthly_amount: 2500 }] });
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ init_point: 'https://mp.com/x', id: 'p1' }) });

    const res = makeRes();
    await handler(makeReq('POST', { club_id: 'qlpm', email: 'user@test.com' }), res);

    const mpCall = fetchMock.mock.calls[2];
    const mpBody = JSON.parse(mpCall[1].body);
    expect(mpBody.external_reference).toBe('user@test.com|club:qlpm|30');
  });
});
