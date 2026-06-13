import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-sb-key';
process.env.ADMIN_SECRET = 'secret-test-123';

const { default: handler } = await import('../api/remove-club-member.js');

function makeRes() {
  const res = { _status: 200, _body: null };
  res.setHeader = () => res;
  res.status = (s) => { res._status = s; return res; };
  res.json = (b) => { res._body = b; return res; };
  res.end = () => res;
  return res;
}

function makeReq(body = {}, headers = {}) {
  return { method: 'DELETE', body, headers };
}

describe('remove-club-member', () => {
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

  it('returns 405 for non-DELETE methods', async () => {
    const res = makeRes();
    await handler({ method: 'GET', body: {}, headers: { 'x-admin-key': 'secret-test-123' } }, res);
    expect(res._status).toBe(405);
  });

  it('returns 400 when club_id or email is missing', async () => {
    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm' }, { 'x-admin-key': 'secret-test-123' }), res);
    expect(res._status).toBe(400);
  });

  it('returns 200 { ok: true } on success', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });

    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm', email: 'member@test.com' }, { 'x-admin-key': 'secret-test-123' }), res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({ ok: true });
  });

  it('sends DELETE to correct Supabase URL with filters', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });

    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm', email: 'member@test.com' }, { 'x-admin-key': 'secret-test-123' }), res);

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toContain('/rest/v1/club_members');
    expect(call[0]).toContain('club_id=eq.qlpm');
    expect(call[0]).toContain('email=eq.');
    expect(call[1].method).toBe('DELETE');
  });
});
