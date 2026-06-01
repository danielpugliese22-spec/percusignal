// src/auth.js
// Autenticación y gestión de plan.
// Mock local con localStorage — listo para reemplazar con Clerk/Supabase.

import { notify } from './notifications.js';

export const PLANS = {
  free:    { name:'Free',    maxInstruments:2, maxMeasures:4,  canSave:false, canCatalog:false, canLoop:false },
  premium: { name:'Premium', maxInstruments:6, maxMeasures:99, canSave:true,  canCatalog:true,  canLoop:true  },
  pro:     { name:'Pro',     maxInstruments:6, maxMeasures:99, canSave:true,  canCatalog:true,  canLoop:true  },
};

export const FREE_INSTRUMENTS = ['conga', 'clave'];

// ── Leer usuario desde localStorage ──
export function getUser() {
  try {
    const raw = localStorage.getItem('percusignal_user');
    if (!raw) return null;
    const u = JSON.parse(raw);

    // Verificar expiración: si active_until pasó, bajar a free
    if (u.active_until && u.plan && u.plan !== 'free') {
      const expiry = new Date(u.active_until);
      if (expiry < new Date()) {
        console.log('[plan] Expirado, bajando a free');
        u.plan = 'free';
        u._expired = true;
        try { localStorage.setItem('percusignal_user', JSON.stringify(u)); } catch {}
      }
    }
    return u;
  } catch { return null; }
}

// ── Guardar usuario y refrescar UI ──
export function setUser(u) {
  if (u) localStorage.setItem('percusignal_user', JSON.stringify(u));
  else   localStorage.removeItem('percusignal_user');
  try { refreshUIForCurrentPlan(); } catch (e) { console.warn('UI refresh:', e); }
  try { window.renderPlanBadge?.(); } catch (e) {}
}

// ── Plan activo ──
export function currentPlan() {
  const u = getUser();
  return PLANS[u?.plan || 'free'];
}

export function isInstrumentLocked(instrId) {
  const plan = currentPlan();
  if (plan.maxInstruments >= 6) return false;
  return !FREE_INSTRUMENTS.includes(instrId);
}

export function canAddMeasure(tracks) {
  const plan = currentPlan();
  const max = Math.max(0, ...Object.values(tracks || {}).map(t => t.length));
  return max < plan.maxMeasures;
}

// ── Refrescar UI según plan ──
export function refreshUIForCurrentPlan() {
  try { if (typeof window.renderPlanBadge === 'function') window.renderPlanBadge(); } catch (e) { console.warn('badge:', e); }

  if (typeof window.INSTRUMENTS === 'undefined') return;

  window.INSTRUMENTS.forEach(inst => {
    const btn = document.getElementById('instrBtn_' + inst.id);
    if (!btn) return;

    const locked = isInstrumentLocked(inst.id);
    btn.style.opacity = locked ? '0.6' : '1';

    const slot = btn.querySelector('[data-icon-slot]');
    if (slot) {
      const existingLock = slot.querySelector('.lock-badge');
      if (existingLock) existingLock.remove();
      if (locked) {
        const lockBadge = document.createElement('span');
        lockBadge.className = 'lock-badge';
        lockBadge.style.cssText = 'position:absolute;bottom:-2px;right:-2px;font-size:11px;background:#000;border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;z-index:2';
        lockBadge.textContent = '🔒';
        slot.appendChild(lockBadge);
      }
    }
  });

  try { if (typeof window.rebuildScoreDisplay === 'function') window.rebuildScoreDisplay(); } catch (e) { console.warn('score:', e); }
}

// ── Login modal ──
export async function showLogin() {
  if (typeof window.showLoginModal === 'function') { window.showLoginModal(); return; }
  const email = await window.promptDialog('Iniciar sesión', 'Ingresá tu email:', { type: 'email', placeholder: 'tu@email.com', okText: 'Iniciar sesión' });
  if (email && email.includes('@')) {
    setUser({ email, plan: 'free' });
    notify('Sesión iniciada como ' + email, 'success');
    setTimeout(() => window.dispatchEvent(new CustomEvent('percuLoginSuccess')), 100);
  }
}

// Exponer globalmente (llamados desde HTML inline y otros módulos)
window.getUser              = getUser;
window.setUser              = setUser;
window.currentPlan          = currentPlan;
window.isInstrumentLocked   = isInstrumentLocked;
window.canAddMeasure        = canAddMeasure;
window.refreshUIForCurrentPlan = refreshUIForCurrentPlan;
window.showLogin            = showLogin;
window.PLANS                = PLANS;
window.FREE_INSTRUMENTS     = FREE_INSTRUMENTS;
