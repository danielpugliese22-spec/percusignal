// app/src/main.js
// Punto de entrada de PercuSignal — Fase 4.4
import './styles.css';

// ── Core ──
import './state.js';

// ── Infraestructura ──
import './notifications.js';

// ── Auth y monetización ──
import './auth.js';
import './paywall.js';

// ── Detección de dedos y ritmo ──
import './hands.js';
import './rhythm.js';

// ── Funcionalidades ──
import './session.js';
import './share.js';

// ── UX / onboarding ──
import './tour.js';
import './onboarding.js';
import './ux.js';

// ── PWA ──
import './pwa.js';

// ── Audio e instrumentos ──
import './audio.js';
import './instruments.js';

// ── UI: event listeners (Fase 4.4) ──
import { initUI } from './ui.js';
import { initUX } from './ux.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initUX();
    initUI();
    _bootstrapApp();
  });
} else {
  initUX();
  initUI();
  _bootstrapApp();
}

function _bootstrapApp() {
  setTimeout(() => {
    try { if (typeof window.renderPlanBadge === 'function') window.renderPlanBadge(); } catch(e) {}
  }, 0);
  _syncPlanInBackground();
  try { window.injectFeedbackFloat?.(); } catch(e) {}
  try { window.checkShareLink?.(); } catch(e) {}
  setTimeout(() => {
    try { window.showOnboarding?.(); } catch(e) {}
  }, 1500);
}

async function _syncPlanInBackground() {
  try {
    const userStr = localStorage.getItem('percusignal_user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    if (!user.email) return;

    if (user._expired) {
      window.notify?.('Tu plan Premium venció. Renová para volver a desbloquear todo', 'warning', 6000);
      delete user._expired;
      try { localStorage.setItem('percusignal_user', JSON.stringify(user)); } catch {}
    }

    const res  = await fetch('/api/get-user-plan?email=' + encodeURIComponent(user.email));
    const data = await res.json();
    const planChanged   = data.plan && data.plan !== user.plan;
    const expiryChanged = data.active_until !== user.active_until;

    if (planChanged || expiryChanged) {
      window.setUser?.({ email: user.email, plan: data.plan || 'free', active_until: data.active_until || null });
      window.renderPlanBadge?.();
      if (planChanged && data.plan !== 'free') {
        window.notify?.('Tu plan ' + data.plan.toUpperCase() + ' está activo ✨', 'success', 4000);
      }
    }
  } catch(e) { console.warn('sync plan:', e); }
}

window._syncPlanInBackground = _syncPlanInBackground;
window.addEventListener('percuLoginSuccess', () => _syncPlanInBackground());
