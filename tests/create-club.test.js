import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-sb-key';
process.env.ADMIN_SECRET = 'secret-test-123';

const { default: handler } = await import('../api/create-club.js');

function makeRes() {
  const res = { _status: 200, _body: null };
  res.setHeader = () => res;
  res.status = (s) => { res._status = s; return res; };
  res.json = (b) => { res._body = b; return res; };
  res.end = () => res;
  return res;
}

function makeReq(body = {}, headers = {}) {
  return { method: 'POST', body, headers };
}

const VALID_BODY = { id: 'nuevo-club', name: 'Club Nuevo', monthly_amount: 3000, admin_email: 'admin@test.com' };

describe('create-club', () => {
  let fetchMock;
  beforeEach(() => { fetchMock = vi.fn(); global.fetch = fetchMock; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns 401 without x-admin-key', async () => {
    const res = makeRes();
    await handler(makeReq(VALID_BODY, {}), res);
    expect(res._status).toBe(401);
  });

  it('returns 401 with wrong key', async () => {
    const res = makeRes();
    await handler(makeReq(VALID_BODY, { 'x-admin-key': 'wrong' }), res);
    expect(res._status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = makeRes();
    await handler(makeReq({ id: 'x', name: 'X' }, { 'x-admin-key': 'secret-test-123' }), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/Faltan campos/);
  });

  it('returns 400 when monthly_amount is not a positive number', async () => {
    const res = makeRes();
    await handler(makeReq({ ...VALID_BODY, monthly_amount: -100 }, { 'x-admin-key': 'secret-test-123' }), res);
    expect(res._status).toBe(400);
  });

  it('returns 201 with club data on success', async () => {
    const created = { id: 'nuevo-club', name: 'Club Nuevo', monthly_amount: 3000, admin_email: 'admin@test.com' };
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [created] });

    const res = makeRes();
    await handler(makeReq(VALID_BODY, { 'x-admin-key': 'secret-test-123' }), res);

    expect(res._status).toBe(201);
    expect(res._body.id).toBe('nuevo-club');
  });

  it('sends correct payload to Supabase with parsed monthly_amount', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'x' }] });

    const res = makeRes();
    await handler(makeReq({ ...VALID_BODY, monthly_amount: '3000' }, { 'x-admin-key': 'secret-test-123' }), res);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.monthly_amount).toBe(3000); // número, no string
    expect(body.id).toBe('nuevo-club');
  });

  it('returns 400 when Supabase returns an error (e.g. duplicate id)', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'duplicate key' }) });

    const res = makeRes();
    await handler(makeReq(VALID_BODY, { 'x-admin-key': 'secret-test-123' }), res);
    expect(res._status).toBe(400);
  });
});
