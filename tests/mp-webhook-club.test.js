import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Desactivar verificación de firma en tests
process.env.MP_ACCESS_TOKEN = 'test-mp-token';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-sb-key';
// Sin MP_WEBHOOK_SECRET → modo dev, firma skiped

const { default: handler } = await import('../api/mp-webhook.js');

function makeRes() {
  const res = { _status: 200, _body: null };
  res.setHeader = () => res;
  res.status = (s) => { res._status = s; return res; };
  res.json = (b) => { res._body = b; return res; };
  res.end = () => res;
  res.send = (b) => { res._body = b; return res; };
  return res;
}

function makeReq(query = {}, body = {}, headers = {}) {
  return { method: 'POST', query, body, headers };
}

function makePaymentFetch(status, externalRef) {
  return {
    json: async () => ({
      id: 'pay_001',
      status,
      external_reference: externalRef,
      payer: { id: 'payer_001', email: 'payer@test.com' }
    })
  };
}

describe('mp-webhook — rama club:', () => {
  let fetchMock;

  beforeEach(() => { fetchMock = vi.fn(); global.fetch = fetchMock; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('writes to club_members when external_reference has club: prefix', async () => {
    // 1) fetch payment, 2) fetch Supabase club_members
    fetchMock
      .mockResolvedValueOnce(makePaymentFetch('approved', 'user@test.com|club:qlpm|30'))
      .mockResolvedValueOnce({ status: 200 });

    const res = makeRes();
    await handler(makeReq({ topic: 'payment', id: 'pay_001' }), res);

    expect(res._body).toBe('OK - club');
    // Verify Supabase call went to club_members
    const sbCall = fetchMock.mock.calls[1];
    expect(sbCall[0]).toContain('/rest/v1/club_members');
    const sbBody = JSON.parse(sbCall[1].body);
    expect(sbBody.club_id).toBe('qlpm');
    expect(sbBody.email).toBe('user@test.com');
    expect(sbBody.active_until).toBeDefined();
  });

  it('writes to users (not club_members) for premium plan', async () => {
    fetchMock
      .mockResolvedValueOnce(makePaymentFetch('approved', 'user@test.com|premium_monthly|30'))
      .mockResolvedValueOnce({ status: 200 });

    const res = makeRes();
    await handler(makeReq({ topic: 'payment', id: 'pay_001' }), res);

    expect(res._body).toBe('OK');
    const sbCall = fetchMock.mock.calls[1];
    expect(sbCall[0]).toContain('/rest/v1/users');
    expect(sbCall[0]).not.toContain('club_members');
  });

  it('does not write anything when payment is not approved', async () => {
    fetchMock.mockResolvedValueOnce(makePaymentFetch('pending', 'user@test.com|club:qlpm|30'));

    const res = makeRes();
    await handler(makeReq({ topic: 'payment', id: 'pay_001' }), res);

    expect(res._body).toBe('not approved');
    // Only 1 fetch call (the payment lookup), no Supabase write
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sets active_until ~30 days from now for club payment', async () => {
    let capturedBody = null;
    fetchMock
      .mockResolvedValueOnce(makePaymentFetch('approved', 'user@test.com|club:qlpm|30'))
      .mockImplementationOnce((url, opts) => {
        capturedBody = JSON.parse(opts.body);
        return Promise.resolve({ status: 200 });
      });

    const res = makeRes();
    const before = Date.now();
    await handler(makeReq({ topic: 'payment', id: 'pay_001' }), res);
    const after = Date.now();

    const activeUntil = new Date(capturedBody.active_until).getTime();
    const expectedMin = before + 29 * 24 * 3600 * 1000;
    const expectedMax = after + 31 * 24 * 3600 * 1000;
    expect(activeUntil).toBeGreaterThanOrEqual(expectedMin);
    expect(activeUntil).toBeLessThanOrEqual(expectedMax);
  });
});
