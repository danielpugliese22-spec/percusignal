// src/paywall.js
// Paywall modal, checkout con MercadoPago, badge de plan y panel de usuario.

import { getUser, setUser, currentPlan, PLANS } from './auth.js';
import { notify, promptDialog } from './notifications.js';

// ── Modal de paywall ──
export function showPaywall(reason = 'premium') {
  const messages = {
    instrument: { icon:'🔒', title:'Instrumento Premium', desc:'Conga y clave están en el plan Free. Surdo, campana, cajón y shekeré requieren Premium.' },
    measures:   { icon:'📊', title:'Límite de compases alcanzado', desc:'El plan Free permite hasta 4 compases por sesión. Pasá a Premium para compases ilimitados.' },
    save:       { icon:'💾', title:'Guardar requiere Premium', desc:'Guardar y cargar sesiones es una feature Premium. Probá 7 días gratis.' },
    catalog:    { icon:'📖', title:'Catálogo Premium', desc:'El catálogo de 30 señas del libro está disponible en Premium.' },
    loop:       { icon:'🔁', title:'Loop requiere Premium', desc:'El loop continuo por pista es una feature Premium.' },
  };
  const m = messages[reason] || messages.instrument;

  document.getElementById('paywallModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'paywallModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,0.85);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s';
  modal.innerHTML = `
    <div style="background:linear-gradient(180deg,#1c1c1e,#0a0a0a);border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:32px;max-width:420px;width:100%;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">${m.icon}</div>
      <h2 style="font-size:24px;font-weight:700;margin-bottom:12px;letter-spacing:-0.5px">${m.title}</h2>
      <p style="color:rgba(255,255,255,0.7);margin-bottom:24px;line-height:1.5;font-size:15px">${m.desc}</p>
      <div style="background:rgba(10,132,255,0.1);border:1px solid rgba(10,132,255,0.3);border-radius:12px;padding:16px;margin-bottom:20px">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#0a84ff;font-weight:600;margin-bottom:6px">Premium · USD 8/mes</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.6">
          ✓ Los 6 instrumentos<br>
          ✓ Compases ilimitados<br>
          ✓ Guardar sesiones · catálogo · loop
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button id="pw-checkout-btn" style="padding:12px;border-radius:12px;border:none;background:#0a84ff;color:#fff;font-size:15px;font-weight:500;cursor:pointer;font-family:inherit">Probar 7 días gratis</button>
        <button id="pw-close-btn" style="padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(255,255,255,0.7);font-size:14px;cursor:pointer;font-family:inherit">Ahora no</button>
      </div>
      <div style="margin-top:16px;font-size:11px;color:rgba(255,255,255,0.3)">
        ¿Ya sos Premium? <a href="#" id="pw-login-link" style="color:#0a84ff">Iniciar sesión</a>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#pw-checkout-btn').onclick = () => startCheckout('premium');
  modal.querySelector('#pw-close-btn').onclick    = () => modal.remove();
  modal.querySelector('#pw-login-link').onclick   = (e) => { e.preventDefault(); window.showLogin?.(); };
}

// ── Iniciar checkout MercadoPago ──
export async function startCheckout(plan) {
  const planMap = { premium: 'premium_monthly', premium_yearly: 'premium_yearly', pro: 'pro' };
  const backendPlan = planMap[plan] || 'premium_monthly';

  const u = getUser();
  let email = u?.email;
  if (!email) {
    email = await promptDialog('Activar Premium', 'Ingresá tu email para iniciar la suscripción:', {
      type: 'email', placeholder: 'tu@email.com', okText: 'Continuar al pago'
    });
    if (!email || !email.includes('@')) { notify('Email inválido', 'error'); return; }
  }

  setUser({ email, plan: 'free' });

  try {
    const res  = await fetch('/api/create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: backendPlan, email })
    });
    const data = await res.json();
    if (data.error)       { notify('Error: ' + data.error, 'error'); return; }
    if (data.init_point)  { window.location.href = data.init_point; }
    else                  { notify('No se pudo generar el link de pago', 'error'); }
  } catch (e) {
    notify('Error de conexión', 'error');
    console.error('[checkout]', e);
  }
}

// ── Badge del plan en el header ──
export function renderPlanBadge() {
  const el = document.getElementById('planBadge');
  if (!el) return;

  const u    = getUser();
  const plan = u?.plan || 'free';

  const styles = {
    free:    'background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.1)',
    premium: 'background:rgba(10,132,255,0.15);color:#0a84ff;border:1px solid rgba(10,132,255,0.3)',
    pro:     'background:rgba(191,90,242,0.15);color:#bf5af2;border:1px solid rgba(191,90,242,0.3)',
  };

  el.style.cssText = `display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;${styles[plan] || styles.free}`;
  el.textContent = plan === 'free' ? 'Free' : plan.charAt(0).toUpperCase() + plan.slice(1);
  el.title = u?.email || '';
  el.onclick = () => showUserPanel();
}

// ── Panel de usuario ──
export async function showUserPanel() {
  const u = getUser();
  if (!u || !u.email) { window.showLogin?.(); return; }

  const plan = PLANS[u.plan || 'free'];
  const expiry = u.active_until
    ? new Date(u.active_until).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' })
    : null;

  document.getElementById('userPanelModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'userPanelModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,0.8);backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div style="background:linear-gradient(180deg,#1c1c28,#0a0a0f);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:28px;max-width:380px;width:100%">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
        <div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#0a84ff,#5e5ce6);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">👤</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:600;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.email}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:2px">Plan ${plan.name}${expiry ? ' · hasta ' + expiry : ''}</div>
        </div>
      </div>
      ${u.plan === 'free' ? `
      <button id="up-upgrade-btn" style="width:100%;padding:11px;border-radius:12px;border:none;background:linear-gradient(135deg,#0a84ff,#5e5ce6);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;margin-bottom:10px">
        ✦ Pasate a Premium
      </button>` : ''}
      <button id="up-logout-btn" style="width:100%;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(255,255,255,0.6);font-size:13px;cursor:pointer;font-family:inherit;margin-bottom:10px">
        Cerrar sesión
      </button>
      <button id="up-close-btn" style="width:100%;padding:10px;border-radius:12px;border:none;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.85);font-size:13px;cursor:pointer;font-family:inherit">
        Cerrar
      </button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#up-close-btn').onclick  = () => modal.remove();
  modal.querySelector('#up-logout-btn').onclick = () => { setUser(null); modal.remove(); notify('Sesión cerrada', 'info'); window.renderPlanBadge?.(); };
  modal.querySelector('#up-upgrade-btn')?.addEventListener('click', () => { modal.remove(); startCheckout('premium'); });
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// ── Inyectar botón de feedback en el header ──
export function injectFeedbackButton() {
  if (document.getElementById('btnFeedback')) return;
  const slot = document.querySelector('.header-actions') || document.querySelector('.toolbar');
  if (!slot) return;
  const btn = document.createElement('button');
  btn.id = 'btnFeedback';
  btn.className = 'ctrl-chip';
  btn.style.cssText = 'display:flex;align-items:center;gap:5px;font-size:11px;padding:5px 10px';
  btn.innerHTML = '💬 Feedback';
  btn.onclick = () => window.showFeedback?.();
  slot.appendChild(btn);
}

// Exponer globalmente
window.showPaywall      = showPaywall;
window.startCheckout    = startCheckout;
window.renderPlanBadge  = renderPlanBadge;
window.showUserPanel    = showUserPanel;
window.injectFeedbackButton = injectFeedbackButton;
