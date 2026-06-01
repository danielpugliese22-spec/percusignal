// src/ux.js
// Polish UX: metrónomo visual, animación de captura, click sound, hint bar.

import { state } from './state.js';

// ─────────────────────────────────────────────
//  1. SONIDO DE FEEDBACK (click sutil)
// ─────────────────────────────────────────────
export function playClickSound() {
  try {
    const ctx = state?.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (!state?.audioCtx) state.audioCtx = ctx;

    const now  = ctx.currentTime;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  } catch(e) { console.warn('Click sound:', e); }
}

// ─────────────────────────────────────────────
//  2. METRÓNOMO VISUAL
// ─────────────────────────────────────────────
function ensureMetronomeIndicator() {
  if (document.getElementById('metronome')) return;
  const m = document.createElement('div');
  m.id = 'metronome';
  m.style.cssText = `position:fixed;top:12px;left:50%;transform:translateX(-50%);display:none;align-items:center;gap:8px;padding:8px 16px;background:rgba(0,0,0,0.75);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);border-radius:999px;z-index:1500;pointer-events:none;`;
  m.innerHTML = `
    <div id="metroDot" style="width:12px;height:12px;border-radius:50%;background:#0a84ff;transition:transform .08s,background .08s,box-shadow .08s"></div>
    <span id="metroBeat" style="color:#fff;font-family:monospace;font-size:13px;font-weight:600;min-width:30px;text-align:center">1</span>
    <span style="color:rgba(255,255,255,0.4);font-size:11px">·</span>
    <span id="metroBpm"  style="color:rgba(255,255,255,0.7);font-size:11px;font-family:monospace">100 BPM</span>
  `;
  document.body.appendChild(m);
}

export function showMetronome() {
  ensureMetronomeIndicator();
  const m = document.getElementById('metronome');
  if (m) { m.style.display = 'flex'; }
  const bpmEl = document.getElementById('metroBpm');
  if (bpmEl && state?.bpm) bpmEl.textContent = state.bpm + ' BPM';
}

export function hideMetronome() {
  const m = document.getElementById('metronome');
  if (m) m.style.display = 'none';
}

export function pulseMetronome(beat, isStrong = false) {
  const dot  = document.getElementById('metroDot');
  const beatEl = document.getElementById('metroBeat');
  if (!dot || !beatEl) return;

  const beatsPerMeasure = state?.compas === '3/4' ? 3 : (state?.compas === '2/4' ? 2 : (state?.compas === '6/8' ? 2 : 4));
  const displayBeat = (beat % beatsPerMeasure) + 1;

  beatEl.textContent = String(displayBeat);
  dot.style.transform  = 'scale(1.6)';
  dot.style.background = isStrong ? '#0a84ff' : 'rgba(10,132,255,0.6)';
  dot.style.boxShadow  = isStrong ? '0 0 12px rgba(10,132,255,0.8)' : '0 0 6px rgba(10,132,255,0.4)';
  setTimeout(() => {
    dot.style.transform  = 'scale(1)';
    dot.style.background = '#0a84ff';
    dot.style.boxShadow  = 'none';
  }, 120);
}

// ─────────────────────────────────────────────
//  3. ANIMACIÓN DE CAPTURA (bounce)
// ─────────────────────────────────────────────
function injectCaptureCSS() {
  if (document.getElementById('captureAnimCSS')) return;
  const style = document.createElement('style');
  style.id = 'captureAnimCSS';
  style.textContent = `
    @keyframes captureBounce {
      0%   { transform:scale(0.7); opacity:0; box-shadow:0 0 0 rgba(10,132,255,0); }
      40%  { transform:scale(1.15); opacity:1; box-shadow:0 0 24px rgba(10,132,255,0.5); }
      70%  { transform:scale(0.95); box-shadow:0 0 12px rgba(10,132,255,0.3); }
      100% { transform:scale(1); opacity:1; box-shadow:0 0 0 rgba(10,132,255,0); }
    }
    @keyframes captureFlash {
      0%   { box-shadow:inset 0 0 0 0 rgba(10,132,255,0); }
      40%  { box-shadow:inset 0 0 60px 0 rgba(10,132,255,0.25); }
      100% { box-shadow:inset 0 0 0 0 rgba(10,132,255,0); }
    }
    @keyframes particle-fly {
      0%   { transform:translate(-50%,-50%) scale(1); opacity:1; }
      100% { transform:translate(calc(-50% + var(--tx)),calc(-50% + var(--ty))) scale(0.4); opacity:0; }
    }
  `;
  document.head.appendChild(style);
}

export function animateCaptureSuccess() {
  injectCaptureCSS();

  const btn = document.getElementById('btnCapture');
  if (btn) { btn.style.animation = 'none'; btn.offsetHeight; btn.style.animation = 'captureBounce .5s ease-out'; }

  const scoreWrap = document.querySelector('.score-wrap');
  if (scoreWrap) { scoreWrap.style.animation = 'none'; scoreWrap.offsetHeight; scoreWrap.style.animation = 'captureFlash .6s ease-out'; }

  // Partículas
  const N = 8;
  for (let i = 0; i < N; i++) {
    const p = document.createElement('div');
    const angle  = (i / N) * Math.PI * 2;
    const dist   = 40 + Math.random() * 30;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;

    p.style.cssText = `
      position:fixed;left:50%;top:50%;width:6px;height:6px;border-radius:50%;
      background:#0a84ff;pointer-events:none;z-index:9999;
      --tx:${tx}px;--ty:${ty}px;
      animation:particle-fly .6s ease-out forwards;animation-delay:${i*0.02}s;
    `;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 700);
  }
}

// ─────────────────────────────────────────────
//  4. HOOKS: conectar con funciones existentes
// ─────────────────────────────────────────────
function hookCapture() {
  if (typeof window.captureCurrentPattern === 'undefined') { setTimeout(hookCapture, 200); return; }
  const original = window.captureCurrentPattern;
  window.captureCurrentPattern = function(...args) {
    const result = original.apply(this, args);
    try { playClickSound(); setTimeout(() => animateCaptureSuccess(), 50); } catch(e) { console.warn('Capture FX:', e); }
    return result;
  };
}

function hookPlay() {
  if (typeof window.playScore === 'undefined') { setTimeout(hookPlay, 200); return; }
  const origPlay = window.playScore;
  window.playScore = async function(...args) { showMetronome(); return origPlay.apply(this, args); };

  const origStop = window.stopScore;
  if (origStop) {
    window.stopScore = function(...args) { window.hideMetronome?.(); return origStop.apply(this, args); };
  }
}

// Tick del metrónomo sincronizado con el audio context
function metronomeTick() {
  let lastBeat = -1;

  function tick() {
    if (!state?.playing) { lastBeat = -1; requestAnimationFrame(tick); return; }

    const ctx = state.audioCtx;
    if (!ctx || !state.playStartTime) { requestAnimationFrame(tick); return; }

    const beatDur    = 60 / state.bpm / 2;
    const elapsed    = ctx.currentTime - state.playStartTime;
    const totalBeats = Math.floor(elapsed / beatDur);

    if (totalBeats !== lastBeat && totalBeats >= 0) {
      lastBeat = totalBeats;
      if (totalBeats % 2 === 0) {
        const beatInMeasure    = totalBeats / 2;
        const beatsPerMeasure  = state.compas === '3/4' ? 3 : (state.compas === '2/4' ? 2 : (state.compas === '6/8' ? 2 : 4));
        const isStrong         = (beatInMeasure % beatsPerMeasure) === 0;
        pulseMetronome(beatInMeasure, isStrong);
      }
    }
    requestAnimationFrame(tick);
  }

  // Parchar playStartTime en state cuando empiece a reproducir
  const observer = setInterval(() => {
    if (state?.playing && state?.audioCtx && !state.playStartTime) {
      state.playStartTime = state.audioCtx.currentTime;
    }
    if (state && !state.playing) state.playStartTime = null;
  }, 50);

  requestAnimationFrame(tick);
}

// ─────────────────────────────────────────────
//  5. HINT BAR
// ─────────────────────────────────────────────
const LS_KEY_HINT = 'percuHintDismissed';

export const percuHint = {
  _cam: false, _hand: false, _content: false,
  _el(id) { return document.getElementById(id); },

  render() {
    const bar = this._el('esHintBar');
    if (!bar) return;
    if (localStorage.getItem(LS_KEY_HINT) || this._content) { bar.classList.add('is-hidden'); return; }
    bar.classList.remove('is-hidden');

    const txt = this._el('esHintText');
    const cta = this._el('esHintCta');

    if (!this._cam) {
      bar.className = 'es-hint-bar';
      if (txt) txt.textContent = 'Activá la cámara para empezar a capturar ritmos';
      if (cta) cta.style.display = 'inline-block';
    } else if (!this._hand) {
      bar.className = 'es-hint-bar es-hint-bar--cam';
      if (txt) txt.textContent = 'Cámara activa — mostrá tu mano y seleccioná un instrumento';
      if (cta) cta.style.display = 'none';
    } else {
      bar.className = 'es-hint-bar es-hint-bar--ready';
      if (txt) txt.textContent = 'Seña detectada — presioná Capturar para grabar el compás';
      if (cta) cta.style.display = 'none';
    }
  },

  dismiss()              { localStorage.setItem(LS_KEY_HINT, '1'); this._el('esHintBar')?.classList.add('is-hidden'); },
  setCameraActive(v)     { this._cam     = v; this.render(); },
  setHandDetected(v)     { this._hand    = v; this.render(); },
  setHasContent(v)       { this._content = v; this.render(); },
};

// ─────────────────────────────────────────────
//  Init — hooking y arranque
// ─────────────────────────────────────────────
export function initUX() {
  hookCapture();
  hookPlay();
  metronomeTick();

  // Observar iHand para hint bar
  const iHand = document.getElementById('iHand');
  if (iHand) {
    new MutationObserver(() => {
      const txt = iHand.textContent.trim();
      percuHint.setHandDetected(txt !== '' && txt !== '—' && txt !== '0');
    }).observe(iHand, { childList: true, characterData: true, subtree: true });
  }

  // Parchar startCamera para hint bar
  if (typeof window.startCamera === 'function') {
    const _origStart = window.startCamera;
    window.startCamera = async function() {
      try {
        await _origStart.apply(this, arguments);
        percuHint.setCameraActive(true);
      } catch(e) { percuHint.setCameraActive(false); throw e; }
    };
  }

  // Parchar captureCurrentPattern para hint bar
  if (typeof window.captureCurrentPattern === 'function') {
    const _origCapture = window.captureCurrentPattern;
    window.captureCurrentPattern = function() {
      _origCapture.apply(this, arguments);
      setTimeout(() => {
        const iM = document.getElementById('iMeasures');
        percuHint.setHasContent(iM ? parseInt(iM.textContent, 10) > 0 : false);
      }, 100);
    };
  }

  // Parchar clearScore para hint bar
  if (typeof window.clearScore === 'function') {
    const _origClear = window.clearScore;
    window.clearScore = function() { _origClear.apply(this, arguments); percuHint.setHasContent(false); };
  }

  percuHint.render();
}

// Exponer globalmente
window.playClickSound       = playClickSound;
window.showMetronome        = showMetronome;
window.hideMetronome        = hideMetronome;
window.pulseMetronome       = pulseMetronome;
window.animateCaptureSuccess = animateCaptureSuccess;
window.percuHint            = percuHint;
