// src/share.js
// Compartir composiciones por link (URL ?share=...).

import { state } from './state.js';
import { notify } from './notifications.js';

export function shareComposition() {
  if (!state?.tracks) { notify('No hay nada para compartir', 'warning'); return; }

  const totalCompases = Object.values(state.tracks).reduce((max, t) => Math.max(max, t.length), 0);
  if (totalCompases === 0) {
    notify('Capturá al menos un compás antes de compartir', 'warning');
    return;
  }

  const payload = { v: 1, bpm: state.bpm, timeSig: state.timeSig, tracks: {} };

  for (const [id, track] of Object.entries(state.tracks)) {
    if (track && track.length > 0) {
      payload.tracks[id] = track.map(c => c?.pattern || []);
    }
  }

  const json       = JSON.stringify(payload);
  const compressed = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const url   = `${location.origin}/app/?share=${compressed}`;
  const nPist = Object.keys(payload.tracks).length;

  document.getElementById('shareModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'shareModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:5000;background:rgba(0,0,0,0.85);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s';
  modal.innerHTML = `
    <div style="background:linear-gradient(180deg,#1c1c28,#0a0a0f);border:1px solid rgba(255,255,255,0.1);border-radius:20px;max-width:440px;width:100%;box-shadow:0 24px 80px rgba(0,0,0,0.6);overflow:hidden">
      <div style="padding:24px 24px 0;text-align:center">
        <div style="font-size:40px;margin-bottom:8px">🔗</div>
        <h2 style="font-size:20px;font-weight:700;margin:0 0 6px;color:#fff">Compartí tu composición</h2>
        <p style="margin:0 0 20px;color:rgba(255,255,255,0.6);font-size:13px">${totalCompases} compás${totalCompases===1?'':'es'} en ${nPist} pista${nPist===1?'':'s'}</p>
      </div>
      <div style="padding:0 24px 20px">
        <div style="display:flex;gap:6px;margin-bottom:14px">
          <input id="shareUrl" type="text" readonly value="${url}"
            style="flex:1;padding:10px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:#0a84ff;font-family:monospace;font-size:11px;box-sizing:border-box"/>
          <button id="shareCopyBtn"
            style="padding:10px 16px;border-radius:10px;border:none;background:linear-gradient(135deg,#0a84ff,#5e5ce6);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap">
            Copiar
          </button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <a href="https://wa.me/?text=${encodeURIComponent('Mirá esta composición que hice en PercuSignal: ' + url)}" target="_blank"
            style="padding:10px;border-radius:10px;background:rgba(48,209,88,0.15);border:1px solid rgba(48,209,88,0.3);color:#30d158;text-decoration:none;font-size:13px;font-weight:600;text-align:center">WhatsApp</a>
          <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent('Mirá esta composición que hice en PercuSignal: ' + url)}" target="_blank"
            style="padding:10px;border-radius:10px;background:rgba(10,132,255,0.15);border:1px solid rgba(10,132,255,0.3);color:#0a84ff;text-decoration:none;font-size:13px;font-weight:600;text-align:center">Twitter / X</a>
        </div>
      </div>
      <div style="padding:14px 24px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
        <button id="shareCloseBtn"
          style="padding:8px 18px;border-radius:8px;border:none;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.85);font-size:13px;font-weight:500;cursor:pointer;font-family:inherit">
          Cerrar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#shareCopyBtn').onclick  = () => copyShareUrl();
  modal.querySelector('#shareCloseBtn').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

export function copyShareUrl() {
  const input = document.getElementById('shareUrl');
  if (!input) return;
  input.select();
  document.execCommand('copy');
  const btn = document.getElementById('shareCopyBtn');
  if (!btn) return;
  btn.textContent = '✓ Copiado';
  btn.style.background = 'linear-gradient(135deg,#30d158,#5ec8ca)';
  setTimeout(() => {
    btn.textContent = 'Copiar';
    btn.style.background = 'linear-gradient(135deg,#0a84ff,#5e5ce6)';
  }, 2000);
}

export function checkShareLink() {
  const params = new URLSearchParams(location.search);
  const shared = params.get('share');
  if (!shared) return;

  try {
    const decoded = atob(shared.replace(/-/g, '+').replace(/_/g, '/'));
    const json    = decodeURIComponent(escape(decoded));
    const payload = JSON.parse(json);

    setTimeout(() => {
      if (!state?.tracks) return;

      state.bpm    = payload.bpm    || 100;
      state.timeSig = payload.timeSig || '4/4';

      for (const [id, patterns] of Object.entries(payload.tracks || {})) {
        state.tracks[id] = patterns.map(p => ({ pattern: p }));
      }

      history.replaceState({}, '', '/app/');
      window.rebuildScoreDisplay?.();
      notify('¡Composición compartida cargada! 🎵', 'success', 4000);
    }, 800);
  } catch (e) {
    console.warn('Share link error:', e);
    notify('No se pudo cargar la composición compartida', 'error');
  }
}

window.shareComposition = shareComposition;
window.copyShareUrl     = copyShareUrl;
window.checkShareLink   = checkShareLink;
