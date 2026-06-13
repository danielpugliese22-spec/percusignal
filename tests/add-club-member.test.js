import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-sb-key';
process.env.ADMIN_SECRET = 'secret-test-123';

const { default: handler } = await import('../api/add-club-member.js');

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

describe('add-club-member', () => {
  let fetchMock;
  beforeEach(() => { fetchMock = vi.fn(); global.fetch = fetchMock; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns 401 without x-admin-key', async () => {
    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm', email: 'a@b.com' }, {}), res);
    expect(res._status).toBe(401);
  });

  it('returns 401 with wrong x-admin-key', async () => {
    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm', email: 'a@b.com' }, { 'x-admin-key': 'wrong' }), res);
    expect(res._status).toBe(401);
  });

  it('returns 405 for non-POST methods', async () => {
    const res = makeRes();
    await handler({ method: 'GET', body: {}, headers: { 'x-admin-key': 'secret-test-123' } }, res);
    expect(res._status).toBe(405);
  });

  it('returns 400 when club_id or email is missing', async () => {
    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm' }, { 'x-admin-key': 'secret-test-123' }), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/Falta/);
  });

  it('inserts member and returns 201 on success', async () => {
    const newMember = { id: 'uuid-1', club_id: 'qlpm', email: 'nuevo@test.com', display_name: 'Nuevo' };
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [newMember] });

    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm', email: 'nuevo@test.com', display_name: 'Nuevo' }, { 'x-admin-key': 'secret-test-123' }), res);

    expect(res._status).toBe(201);
    expect(res._body.email).toBe('nuevo@test.com');
  });

  it('sends correct payload to Supabase', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'x' }] });

    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm', email: 'test@test.com', display_name: 'Test' }, { 'x-admin-key': 'secret-test-123' }), res);

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toContain('/rest/v1/club_members');
    const body = JSON.parse(call[1].body);
    expect(body.club_id).toBe('qlpm');
    expect(body.email).toBe('test@test.com');
    expect(body.display_name).toBe('Test');
  });

  it('returns 400 when Supabase returns an error (e.g. duplicate)', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'duplicate key' }) });

    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm', email: 'dup@test.com' }, { 'x-admin-key': 'secret-test-123' }), res);
    expect(res._status).toBe(400);
  });
});
