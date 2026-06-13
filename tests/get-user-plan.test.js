import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-sb-key';
process.env.RESEND_API_KEY = 'test-resend-key';

const { default: handler } = await import('../api/get-user-plan.js');

function makeRes() {
  const res = { _status: 200, _body: null };
  res.setHeader = () => res;
  res.status = (s) => { res._status = s; return res; };
  res.json = (b) => { res._body = b; return res; };
  res.end = () => res;
  return res;
}

const FUTURE = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
const PAST = new Date(Date.now() - 1000).toISOString();

describe('get-user-plan', () => {
  let fetchMock;
  beforeEach(() => { fetchMock = vi.fn(); global.fetch = fetchMock; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns 400 when email is missing', async () => {
    const res = makeRes();
    await handler({ query: {} }, res);
    expect(res._status).toBe(400);
  });

  it('returns plan for existing user', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => [{ plan: 'premium', active_until: FUTURE }] });

    const res = makeRes();
    await handler({ query: { email: 'existing@test.com' } }, res);

    expect(res._status).toBe(200);
    expect(res._body.plan).toBe('premium');
    expect(fetchMock).toHaveBeenCalledTimes(1); // solo SELECT, no INSERT ni email
  });

  it('downgrades expired premium user to free', async () => {
    fetchMock.mockResolvedValueOnce({ json: async () => [{ plan: 'premium', active_until: PAST }] });

    const res = makeRes();
    await handler({ query: { email: 'expired@test.com' } }, res);

    expect(res._body.plan).toBe('free');
  });

  it('creates user record for new email', async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => [] }) // SELECT → vacío
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) }) // INSERT
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'email-001' }) }); // Resend

    const res = makeRes();
    await handler({ query: { email: 'nuevo@test.com' } }, res);

    expect(res._status).toBe(200);
    expect(res._body.plan).toBe('free');

    // Verificar INSERT a Supabase
    const insertCall = fetchMock.mock.calls[1];
    expect(insertCall[0]).toContain('/rest/v1/users');
    expect(insertCall[1].method).toBe('POST');
    const insertBody = JSON.parse(insertCall[1].body);
    expect(insertBody.email).toBe('nuevo@test.com');
    expect(insertBody.plan).toBe('free');
    expect(insertCall[1].headers['Prefer']).toContain('ignore-duplicates');
  });

  it('sends welcome email to new user', async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'email-002' }) });

    const res = makeRes();
    await handler({ query: { email: 'nuevo2@test.com' } }, res);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const resendCall = fetchMock.mock.calls[2];
    expect(resendCall[0]).toBe('https://api.resend.com/emails');
    const body = JSON.parse(resendCall[1].body);
    expect(body.to).toBe('nuevo2@test.com');
    expect(body.from).toBe('info@percusignal.com.ar');
    expect(body.subject).toContain('Bienvenido');
    expect(body.html).toContain('/app');
  });

  it('still returns 200 even when INSERT fails', async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => [] })
      .mockRejectedValueOnce(new Error('Supabase error')); // INSERT falla

    const res = makeRes();
    await handler({ query: { email: 'fail@test.com' } }, res);

    expect(res._status).toBe(200);
    expect(res._body.plan).toBe('free');
  });

  it('still returns 200 even when welcome email fails', async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // INSERT ok
      .mockRejectedValueOnce(new Error('Resend down')); // email falla

    const res = makeRes();
    await handler({ query: { email: 'emailfail@test.com' } }, res);

    expect(res._status).toBe(200);
    expect(res._body.plan).toBe('free');
  });
});
