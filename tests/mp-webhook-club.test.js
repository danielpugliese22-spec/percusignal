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

// call[0] = MP payment lookup, call[1] = club_members, call[2] = users
describe('mp-webhook — rama club:', () => {
  let fetchMock;

  beforeEach(() => { fetchMock = vi.fn(); global.fetch = fetchMock; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('writes to club_members when external_reference has club: prefix', async () => {
    fetchMock
      .mockResolvedValueOnce(makePaymentFetch('approved', 'user@test.com|club:qlpm|30'))
      .mockResolvedValueOnce({ status: 200 }) // club_members
      .mockResolvedValueOnce({ status: 200 }); // users

    const res = makeRes();
    await handler(makeReq({ topic: 'payment', id: 'pay_001' }), res);

    expect(res._body).toBe('OK - club');
    const sbClubCall = fetchMock.mock.calls[1];
    expect(sbClubCall[0]).toContain('/rest/v1/club_members');
    const sbClubBody = JSON.parse(sbClubCall[1].body);
    expect(sbClubBody.club_id).toBe('qlpm');
    expect(sbClubBody.email).toBe('user@test.com');
    expect(sbClubBody.active_until).toBeDefined();
  });

  it('also upserts users with plan=premium when club payment is approved', async () => {
    fetchMock
      .mockResolvedValueOnce(makePaymentFetch('approved', 'user@test.com|club:qlpm|30'))
      .mockResolvedValueOnce({ status: 200 }) // club_members
      .mockResolvedValueOnce({ status: 200 }); // users

    const res = makeRes();
    await handler(makeReq({ topic: 'payment', id: 'pay_001' }), res);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const sbUserCall = fetchMock.mock.calls[2];
    expect(sbUserCall[0]).toContain('/rest/v1/users');
    const sbUserBody = JSON.parse(sbUserCall[1].body);
    expect(sbUserBody.email).toBe('user@test.com');
    expect(sbUserBody.plan).toBe('premium');
    expect(sbUserBody.active_until).toBeDefined();
  });

  it('users upsert shares the same active_until as club_members', async () => {
    fetchMock
      .mockResolvedValueOnce(makePaymentFetch('approved', 'user@test.com|club:qlpm|30'))
      .mockResolvedValueOnce({ status: 200 })
      .mockResolvedValueOnce({ status: 200 });

    const res = makeRes();
    await handler(makeReq({ topic: 'payment', id: 'pay_001' }), res);

    const clubBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    const userBody = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(clubBody.active_until).toBe(userBody.active_until);
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
    expect(fetchMock).toHaveBeenCalledTimes(2); // solo MP + users, no club_members
  });

  it('does not write anything when payment is not approved', async () => {
    fetchMock.mockResolvedValueOnce(makePaymentFetch('pending', 'user@test.com|club:qlpm|30'));

    const res = makeRes();
    await handler(makeReq({ topic: 'payment', id: 'pay_001' }), res);

    expect(res._body).toBe('not approved');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sets active_until ~30 days from now for both club_members and users', async () => {
    fetchMock
      .mockResolvedValueOnce(makePaymentFetch('approved', 'user@test.com|club:qlpm|30'))
      .mockResolvedValueOnce({ status: 200 })
      .mockResolvedValueOnce({ status: 200 });

    const res = makeRes();
    const before = Date.now();
    await handler(makeReq({ topic: 'payment', id: 'pay_001' }), res);
    const after = Date.now();

    const expectedMin = before + 29 * 24 * 3600 * 1000;
    const expectedMax = after + 31 * 24 * 3600 * 1000;

    for (const callIndex of [1, 2]) {
      const body = JSON.parse(fetchMock.mock.calls[callIndex][1].body);
      const activeUntil = new Date(body.active_until).getTime();
      expect(activeUntil).toBeGreaterThanOrEqual(expectedMin);
      expect(activeUntil).toBeLessThanOrEqual(expectedMax);
    }
  });
});
