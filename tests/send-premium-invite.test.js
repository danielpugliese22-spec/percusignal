import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-sb-key';
process.env.ADMIN_SECRET = 'secret-test-123';
process.env.RESEND_API_KEY = 'test-resend-key';

const { default: handler } = await import('../api/send-premium-invite.js');

function makeRes() {
  const res = { _status: 200, _body: null };
  res.setHeader = () => res;
  res.status = (s) => { res._status = s; return res; };
  res.json = (b) => { res._body = b; return res; };
  res.end = () => res;
  return res;
}

function makeReq(headers = {}) {
  return { method: 'POST', headers, body: {}, query: {} };
}

const AUTH = { 'x-admin-key': 'secret-test-123' };

describe('send-premium-invite — auth', () => {
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

  it('returns 405 for GET method', async () => {
    const res = makeRes();
    await handler({ method: 'GET', headers: AUTH, body: {}, query: {} }, res);
    expect(res._status).toBe(405);
  });
});

describe('send-premium-invite — lógica', () => {
  let fetchMock;
  beforeEach(() => { fetchMock = vi.fn(); global.fetch = fetchMock; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('queries Supabase for free users with limit 200', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => [] });

    const res = makeRes();
    await handler(makeReq(AUTH), res);

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toContain('/rest/v1/users');
    expect(call[0]).toContain('plan=eq.free');
    expect(call[0]).toContain('limit=200');
  });

  it('returns 0 sent when no free users', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => [] });

    const res = makeRes();
    await handler(makeReq(AUTH), res);

    expect(res._body.ok).toBe(true);
    expect(res._body.sent).toBe(0);
    expect(res._body.total).toBe(0);
  });

  it('sends one invite email per free user', async () => {
    const users = [
      { email: 'free1@test.com' },
      { email: 'free2@test.com' },
      { email: 'free3@test.com' }
    ];

    fetchMock
      .mockResolvedValueOnce({ json: async () => users }) // GET usuarios
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e1' }) }) // Resend free1
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e2' }) }) // Resend free2
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e3' }) }); // Resend free3

    const res = makeRes();
    await handler(makeReq(AUTH), res);

    expect(res._body.sent).toBe(3);
    expect(res._body.errors).toBe(0);
    expect(res._body.total).toBe(3);

    // Verificar primer email
    const first = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(first.to).toBe('free1@test.com');
    expect(first.from).toBe('info@percusignal.com.ar');
    expect(first.subject).toContain('Premium');
    expect(first.html).toContain('free1');
  });

  it('counts errors and continues when individual email fails', async () => {
    const users = [{ email: 'ok@test.com' }, { email: 'fail@test.com' }, { email: 'ok2@test.com' }];

    fetchMock
      .mockResolvedValueOnce({ json: async () => users })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e1' }) })
      .mockRejectedValueOnce(new Error('Resend down')) // fail@test.com
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e3' }) });

    const res = makeRes();
    await handler(makeReq(AUTH), res);

    expect(res._body.sent).toBe(2);
    expect(res._body.errors).toBe(1);
    expect(res._body.total).toBe(3);
    expect(res._status).toBe(200);
  });

  it('sends from info@percusignal.com.ar', async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => [{ email: 'user@test.com' }] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e' }) });

    const res = makeRes();
    await handler(makeReq(AUTH), res);

    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.from).toBe('info@percusignal.com.ar');
  });
});
