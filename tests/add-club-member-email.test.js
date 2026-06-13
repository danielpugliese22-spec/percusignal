import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-sb-key';
process.env.ADMIN_SECRET = 'secret-test-123';
process.env.RESEND_API_KEY = 'test-resend-key';

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

const AUTH = { 'x-admin-key': 'secret-test-123' };

describe('add-club-member — emails', () => {
  let fetchMock;
  beforeEach(() => { fetchMock = vi.fn(); global.fetch = fetchMock; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('sends welcome email with club name after successful INSERT', async () => {
    const newMember = { id: 'uuid-1', club_id: 'qlpm', email: 'nuevo@test.com', display_name: 'Carlos' };
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => [newMember] }) // INSERT club_members
      .mockResolvedValueOnce({ json: async () => [{ id: 'qlpm', name: 'Qué le pasa a María?' }] }) // GET clubs
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'email-001' }) }); // Resend

    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm', email: 'nuevo@test.com', display_name: 'Carlos' }, AUTH), res);

    expect(res._status).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Verificar llamada a Resend
    const resendCall = fetchMock.mock.calls[2];
    expect(resendCall[0]).toBe('https://api.resend.com/emails');
    const body = JSON.parse(resendCall[1].body);
    expect(body.to).toBe('nuevo@test.com');
    expect(body.from).toBe('info@percusignal.com.ar');
    expect(body.subject).toContain('Qué le pasa a María?');
    expect(body.html).toContain('Carlos');
  });

  it('fetches club name from Supabase clubs table', async () => {
    const newMember = { id: 'uuid-2', club_id: 'qlpm', email: 'test@test.com' };
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => [newMember] })
      .mockResolvedValueOnce({ json: async () => [{ id: 'qlpm', name: 'Mi Banda' }] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e2' }) });

    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm', email: 'test@test.com' }, AUTH), res);

    const clubCall = fetchMock.mock.calls[1];
    expect(clubCall[0]).toContain('/rest/v1/clubs');
    expect(clubCall[0]).toContain('id=eq.qlpm');
  });

  it('uses club_id as fallback when clubs fetch returns empty', async () => {
    const newMember = { id: 'uuid-3', club_id: 'qlpm', email: 'test@test.com' };
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => [newMember] })
      .mockResolvedValueOnce({ json: async () => [] }) // clubs vacío
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e3' }) });

    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm', email: 'test@test.com' }, AUTH), res);

    expect(res._status).toBe(201);
    const resendBody = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(resendBody.subject).toContain('qlpm'); // fallback al club_id
  });

  it('still returns 201 even if email sending fails', async () => {
    const newMember = { id: 'uuid-4', club_id: 'qlpm', email: 'test@test.com' };
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => [newMember] })
      .mockResolvedValueOnce({ json: async () => [{ id: 'qlpm', name: 'Club' }] })
      .mockRejectedValueOnce(new Error('Resend unavailable')); // Resend falla

    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm', email: 'test@test.com' }, AUTH), res);

    expect(res._status).toBe(201);
  });

  it('email contains display_name in html body', async () => {
    const newMember = { id: 'uuid-5', club_id: 'qlpm', email: 'pepita@test.com', display_name: 'Pepita' };
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => [newMember] })
      .mockResolvedValueOnce({ json: async () => [{ id: 'qlpm', name: 'Club Test' }] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'e5' }) });

    const res = makeRes();
    await handler(makeReq({ club_id: 'qlpm', email: 'pepita@test.com', display_name: 'Pepita' }, AUTH), res);

    const body = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(body.html).toContain('Pepita');
  });
});
