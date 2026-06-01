/**
 * ui.js — PercuSignal Fase 4.4
 * Reemplaza los 33 onclick eliminados del HTML.
 * Usa data-action / data-* para botones sin id,
 * e id directo para los que ya lo tenían.
 */

import { state }                          from './state.js';
import { muteState, setInstrumentVolume } from './instruments.js';
import { playClickSound, percuHint }      from './ux.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function on(id, event, handler) {
  const el = document.getElementById(id);
  if (!el) { console.warn(`[ui.js] #${id} no encontrado.`); return; }
  el.addEventListener(event, handler);
}

function delegate(rootSelector, selector, event, handler) {
  const root = document.querySelector(rootSelector);
  if (!root) { console.warn(`[ui.js] ${rootSelector} no encontrado.`); return; }
  root.addEventListener(event, (e) => {
    const t = e.target.closest(selector);
    if (t && root.contains(t)) handler(e, t);
  });
}

function call(name, ...args) {
  if (typeof window[name] === 'function') return window[name](...args);
  console.warn(`[ui.js] window.${name} no disponible.`);
}

// ─── Transport ────────────────────────────────────────────────────────────────

function initTransport() {
  on('btnPlay',    'click', () => call('playScore'));
  on('btnStop',    'click', () => call('stopScore'));
  on('btnCapture', 'click', () => call('captureCurrentPattern'));
  on('btnVoice',   'click', () => call('toggleVoice'));
}

// ─── BPM ─────────────────────────────────────────────────────────────────────

function initBpm() {
  // Slider principal
  on('bpmSlider', 'input', (e) => {
    call('setBpm', e.target.value);
  });

  // Botones +/- (data-action="bpm-step" data-delta="-5")
  delegate('.bpm-pill', '[data-action="bpm-step"]', 'click', (e, btn) => {
    call('stepBpm', parseInt(btn.dataset.delta, 10));
  });

  // Presets (data-action="bpm-preset" data-bpm="120")
  delegate('.bpm-presets', '[data-action="bpm-preset"]', 'click', (e, btn) => {
    call('setBpm', parseInt(btn.dataset.bpm, 10));
  });
}

// ─── Compás ───────────────────────────────────────────────────────────────────

function initCompas() {
  // Botones seg-btn con data-val="4/4"
  delegate('#segCompas', '[data-val]', 'click', (e, btn) => {
    call('setCompas', btn.dataset.val);
    call('segActive', 'segCompas', btn);
  });
}

// ─── Cámara ───────────────────────────────────────────────────────────────────

function initCamera() {
  on('btnStart',   'click', () => call('startCamera'));
  on('btnStopCam', 'click', () => call('stopCamera'));
}

// ─── Hint bar ─────────────────────────────────────────────────────────────────

function initHintBar() {
  // esHintCta activa la cámara clickeando btnStart
  on('esHintCta', 'click', () => {
    document.getElementById('btnStart')?.click();
  });
  on('esHintClose', 'click', () => percuHint.dismiss());
}

// ─── Tutorial ─────────────────────────────────────────────────────────────────

function initTutorial() {
  // data-action="tutorial-menu" → showTutorialMenu()
  // data-action="tutorial" data-tutorial="gesture" → showTutorial('gesture')
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'tutorial-menu') call('showTutorialMenu');
    if (btn.dataset.action === 'tutorial')      call('showTutorial', btn.dataset.tutorial);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') call('closeTutorial');
  });
}

// ─── Sesión ───────────────────────────────────────────────────────────────────

function initSession() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    switch (btn.dataset.action) {
      case 'share':        call('shareComposition');  break;
      case 'save-session': call('saveSession');        break;
      case 'load-session': call('loadSession');        break;
      case 'export-audio': call('exportAudio');        break;
      case 'clear-score':  call('clearScore');         break;
    }
  });
}

// ─── Señas / catálogo ─────────────────────────────────────────────────────────

function initSigns() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'open-signs') {
      const panel = document.getElementById('signsPanel');
      if (panel) panel.style.display = 'block';
      call('renderSignsCatalog');
    }
    if (btn.dataset.action === 'close-signs') {
      const panel = document.getElementById('signsPanel');
      if (panel) panel.style.display = 'none';
    }
  });
}

// ─── Insert banner ────────────────────────────────────────────────────────────

function initInsertBanner() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'confirm-insert') call('confirmInsert');
    if (btn.dataset.action === 'cancel-insert')  call('cancelInsert');
  });
}

// ─── Instrumentos (generados dinámicamente) ───────────────────────────────────

function initInstruments() {
  delegate('#instrBtns', 'button', 'click', (e, btn) => {
    const instrId = btn.dataset.instr ?? btn.id;
    if (!instrId) return;
    window.activeInstrId = instrId;
    playClickSound();
    call('onInstrumentSelect', instrId);
  });

  delegate('#instrControls', '[data-mute]', 'click', (e, btn) => {
    const instrId = btn.dataset.mute;
    muteState[instrId] = !muteState[instrId];
    btn.classList.toggle('muted', muteState[instrId]);
    playClickSound();
  });

  delegate('#instrControls', 'input[type="range"]', 'input', (e, slider) => {
    const instrId = slider.dataset.instr;
    if (instrId) setInstrumentVolume(instrId, parseFloat(slider.value));
  });
}

// ─── Teclado global ───────────────────────────────────────────────────────────

function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Space') {
      e.preventDefault();
      state.playing ? call('stopScore') : call('playScore');
    }
    if (e.code === 'KeyC') call('captureCurrentPattern');
  });
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function initUI() {
  initTransport();
  initBpm();
  initCompas();
  initCamera();
  initHintBar();
  initTutorial();
  initSession();
  initSigns();
  initInsertBanner();
  initInstruments();
  initKeyboard();
  console.info('[PercuSignal] UI inicializada — Fase 4.4 ✓');
}
