import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

process.env.MP_ACCESS_TOKEN = 'test-mp-token';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-sb-key';
process.env.RESEND_API_KEY = 'test-resend-key';
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

function makePaymentFetch(status, externalRef, amount = 8900) {
  return {
    json: async () => ({
      id: 'pay_001',
      status,
      external_reference: externalRef,
      transaction_amount: amount,
      payer: { id: 'payer_001', email: 'payer@test.com' }
    })
  };
}

// call[0] = MP payment, call[1] = club_members, call[2] = users,
// call[3] = clubs (admin_email), call[4] = Resend (admin)
describe('mp-webhook — emails rama club:', () => {
  let fetchMock;
  beforeEach(() => { fetchMock = vi.fn(); global.fetch = fetchMock; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('sends admin notification email after club payment', async () => {
    fetchMock
      .mockResolvedValueOnce(makePaymentFetch('approved', 'user@test.com|club:qlpm|30'))
      .mockResolvedValueOnce({ status: 200 }) // club_members
      .mockResolvedValueOnce({ status: 200 }) // users
      .mockResolvedValueOnce({ json: async () => [{ name: 'Qué le pasa a María?', admin_email: 'danielpugliese22@gmail.com' }] }) // clubs
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'email-101' }) }); // Resend

    const res = makeRes();
    await handler(makeReq({ topic: 'payment', id: 'pay_001' }), res);

    expect(res._body).toBe('OK - club');
    expect(fetchMock).toHaveBeenCalledTimes(5);

    const resendCall = fetchMock.mock.calls[4];
    expect(resendCall[0]).toBe('https://api.resend.com/emails');
    const body = JSON.parse(resendCall[1].body);
    expect(body.to).toBe('danielpugliese22@gmail.com');
    expect(body.subject).toContain('user@test.com');
    expect(body.html).toContain('user@test.com');
  });

  it('fetches clubs table with club_id to get admin_email', async () => {
    fetchMock
      .mockResolvedValueOnce(makePaymentFetch('approved', 'user@test.com|club:qlpm|30'))
      .mockResolvedValueOnce({ status: 200 })
      .mockResolvedValueOnce({ status: 200 })
      .mockResolvedValueOnce({ json: async () => [{ name: 'Banda', admin_email: 'admin@test.com' }] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e' }) });

    const res = makeRes();
    await handler(makeReq({ topic: 'payment', id: 'pay_001' }), res);

    const clubsCall = fetchMock.mock.calls[3];
    expect(clubsCall[0]).toContain('/rest/v1/clubs');
    expect(clubsCall[0]).toContain('id=eq.qlpm');
    expect(clubsCall[0]).toContain('admin_email');
  });

  it('still returns OK - club even if email sending fails', async () => {
    fetchMock
      .mockResolvedValueOnce(makePaymentFetch('approved', 'user@test.com|club:qlpm|30'))
      .mockResolvedValueOnce({ status: 200 })
      .mockResolvedValueOnce({ status: 200 })
      .mockResolvedValueOnce({ json: async () => [{ name: 'Club', admin_email: 'admin@test.com' }] })
      .mockRejectedValueOnce(new Error('Resend down')); // email falla

    const res = makeRes();
    await handler(makeReq({ topic: 'payment', id: 'pay_001' }), res);

    expect(res._body).toBe('OK - club');
  });

  it('skips email when clubs returns no admin_email', async () => {
    fetchMock
      .mockResolvedValueOnce(makePaymentFetch('approved', 'user@test.com|club:qlpm|30'))
      .mockResolvedValueOnce({ status: 200 })
      .mockResolvedValueOnce({ status: 200 })
      .mockResolvedValueOnce({ json: async () => [] }); // clubs vacío, sin admin_email

    const res = makeRes();
    await handler(makeReq({ topic: 'payment', id: 'pay_001' }), res);

    expect(res._body).toBe('OK - club');
    expect(fetchMock).toHaveBeenCalledTimes(4); // sin Resend
  });
});

// call[0] = MP payment, call[1] = users,
// call[2] = Resend (user confirm), call[3] = Resend (admin)
describe('mp-webhook — emails rama individual:', () => {
  let fetchMock;
  beforeEach(() => { fetchMock = vi.fn(); global.fetch = fetchMock; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('sends confirmation email to paying user', async () => {
    fetchMock
      .mockResolvedValueOnce(makePaymentFetch('approved', 'buyer@test.com|premium_monthly|30'))
      .mockResolvedValueOnce({ status: 200 }) // users
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'email-201' }) }) // Resend user
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'email-202' }) }); // Resend admin

    const res = makeRes();
    await handler(makeReq({ topic: 'payment', id: 'pay_001' }), res);

    expect(res._body).toBe('OK');

    const resendUserCall = fetchMock.mock.calls[2];
    expect(resendUserCall[0]).toBe('https://api.resend.com/emails');
    const userBody = JSON.parse(resendUserCall[1].body);
    expect(userBody.to).toBe('buyer@test.com');
    expect(userBody.subject).toContain('Premium');
    expect(userBody.html).toContain('Premium');
  });

  it('sends admin notification to danielpugliese22@gmail.com', async () => {
    fetchMock
      .mockResolvedValueOnce(makePaymentFetch('approved', 'buyer@test.com|premium_monthly|30', 8900))
      .mockResolvedValueOnce({ status: 200 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e2' }) });

    const res = makeRes();
    await handler(makeReq({ topic: 'payment', id: 'pay_001' }), res);

    const resendAdminCall = fetchMock.mock.calls[3];
    const adminBody = JSON.parse(resendAdminCall[1].body);
    expect(adminBody.to).toBe('danielpugliese22@gmail.com');
    expect(adminBody.subject).toContain('buyer@test.com');
    expect(adminBody.html).toContain('8.900');
  });

  it('still returns OK even if user email fails', async () => {
    fetchMock
      .mockResolvedValueOnce(makePaymentFetch('approved', 'buyer@test.com|premium_monthly|30'))
      .mockResolvedValueOnce({ status: 200 })
      .mockRejectedValueOnce(new Error('Resend down')) // user email falla
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e' }) }); // admin email ok

    const res = makeRes();
    await handler(makeReq({ topic: 'payment', id: 'pay_001' }), res);

    expect(res._body).toBe('OK');
  });

  it('sends 4 total fetch calls for individual premium payment', async () => {
    fetchMock
      .mockResolvedValueOnce(makePaymentFetch('approved', 'x@test.com|premium_monthly|30'))
      .mockResolvedValueOnce({ status: 200 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e2' }) });

    const res = makeRes();
    await handler(makeReq({ topic: 'payment', id: 'pay_001' }), res);

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
