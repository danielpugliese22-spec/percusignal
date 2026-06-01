// src/pwa.js
// PWA: registro del Service Worker y prompt de instalación (Android + iOS).

import { notify } from './notifications.js';

let deferredInstallPrompt = null;

// ── Registrar Service Worker ──
export function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('[SW] Registered'))
      .catch(e => console.warn('[SW] Failed:', e));
  });
}

// ── Install prompt (Android / Chrome) ──
export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallButton();
  });

  // iOS: mostrar instrucciones manuales si no está instalada
  window.addEventListener('load', () => {
    if (detectIOS() && !window.matchMedia('(display-mode: standalone)').matches) {
      setTimeout(() => {
        if (document.getElementById('btnInstall')) return;
        _injectInstallButton('⬇ Instalar', showIOSInstall);
      }, 1000);
    }
  });
}

function showInstallButton() {
  if (document.getElementById('btnInstall')) return;
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  _injectInstallButton('⬇ Instalar app', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      document.getElementById('btnInstall')?.remove();
      notify('App instalada en tu pantalla de inicio', 'success', 5000);
    }
    deferredInstallPrompt = null;
  });
}

function _injectInstallButton(label, handler) {
  const slot = document.querySelector('.header-actions') || document.querySelector('header');
  if (!slot) return;
  const btn = document.createElement('button');
  btn.id = 'btnInstall';
  btn.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:980px;border:1px solid rgba(10,132,255,0.4);background:rgba(10,132,255,0.1);color:#0a84ff;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500;margin-right:8px';
  btn.innerHTML = label;
  btn.onclick = handler;
  slot.insertBefore(btn, slot.firstChild);
}

function detectIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function showIOSInstall() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:4000;background:rgba(0,0,0,0.85);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div style="background:linear-gradient(180deg,#1c1c28,#0a0a0f);border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:28px;max-width:380px;width:100%">
      <div style="font-size:40px;text-align:center;margin-bottom:14px">📱</div>
      <h2 style="font-size:20px;font-weight:700;margin:0 0 16px;text-align:center;color:#fff">Instalar PercuSignal</h2>
      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px">
        ${[
          ['1', 'Tocá el ícono <strong>Compartir</strong> ↑ en Safari'],
          ['2', 'Buscá <strong>"Agregar a inicio"</strong>'],
          ['3', 'Tocá <strong>"Agregar"</strong> arriba a la derecha'],
        ].map(([n, txt]) => `
          <div style="display:flex;align-items:flex-start;gap:12px;padding:12px;background:rgba(255,255,255,0.04);border-radius:12px">
            <div style="width:28px;height:28px;border-radius:50%;background:#0a84ff;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;flex-shrink:0">${n}</div>
            <div style="flex:1;font-size:13px;color:rgba(255,255,255,0.85);line-height:1.5">${txt}</div>
          </div>`).join('')}
      </div>
      <button id="ios-ok" style="width:100%;padding:11px;border-radius:10px;border:none;background:linear-gradient(135deg,#0a84ff,#5e5ce6);color:#fff;font-size:14px;font-weight:600;cursor:pointer">Entendido</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#ios-ok').onclick  = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// Auto-init
registerSW();
initInstallPrompt();
