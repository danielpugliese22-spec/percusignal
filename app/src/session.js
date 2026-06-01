// src/session.js
// Guardar y cargar sesiones en formato JSON.

import { state } from './state.js';
import { currentPlan } from './auth.js';
import { showPaywall } from './paywall.js';
import { notify } from './notifications.js';

export function saveSession() {
  if (!currentPlan().canSave) { showPaywall('save'); return; }

  const session = {
    version: 1,
    bpm: state.bpm,
    compas: state.compas,
    subdiv: state.subdiv,
    tracks: {},
    muteState: { ...window.muteState },
    loopState: { ...window.loopState },
    savedAt: new Date().toISOString(),
  };

  window.INSTRUMENTS?.forEach(inst => {
    session.tracks[inst.id] = (state.tracks[inst.id] || []).map(m => ({
      pattern:   m.pattern,
      compas:    m.compas,
      rightMask: m.rightMask,
      leftMask:  m.leftMask,
      rightFist: m.rightFist,
      leftFist:  m.leftFist,
    }));
  });

  const json = JSON.stringify(session, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const ts   = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
  a.download = `percusignal_${ts}.json`;
  a.href = url;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  window.showVoiceFeedback?.('✓ Sesión guardada');
}

export function loadSession() {
  if (!currentPlan().canSave) { showPaywall('save'); return; }

  const input = document.createElement('input');
  input.type    = 'file';
  input.accept  = '.json,application/json';
  input.style.display = 'none';

  const container = document.fullscreenElement || document.webkitFullscreenElement || document.body;
  container.appendChild(input);

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const session = JSON.parse(ev.target.result);
        if (!session.version || !session.tracks) throw new Error('Archivo inválido');

        window.setBpm?.(session.bpm || 100);
        state.compas = session.compas || '4/4';
        state.subdiv = session.subdiv || '2';

        window.INSTRUMENTS?.forEach(inst => {
          state.tracks[inst.id] = (session.tracks[inst.id] || []).map(m => ({
            pattern:   m.pattern,
            compas:    m.compas || state.compas,
            rightMask: m.rightMask || [false, false, false, false],
            leftMask:  m.leftMask  || [false, false, false, false],
            rightFist: m.rightFist || false,
            leftFist:  m.leftFist  || false,
          }));
        });

        // Restaurar mute/loop
        if (session.muteState && window.muteState) {
          window.INSTRUMENTS?.forEach(inst => {
            window.muteState[inst.id] = session.muteState[inst.id] || false;
            const btn = document.getElementById('muteBtn_' + inst.id);
            if (btn) {
              const on = window.muteState[inst.id];
              btn.style.background   = on ? 'var(--red)'   : 'var(--fill2)';
              btn.style.color        = on ? '#fff'          : 'var(--label3)';
              btn.style.borderColor  = on ? 'var(--red)'   : 'var(--separator)';
            }
          });
        }
        if (session.loopState && window.loopState) {
          window.INSTRUMENTS?.forEach(inst => {
            window.loopState[inst.id] = session.loopState[inst.id] || false;
            const btn = document.getElementById('loopBtn_' + inst.id);
            if (btn) {
              const on = window.loopState[inst.id];
              btn.style.background   = on ? 'var(--green)' : 'var(--fill2)';
              btn.style.color        = on ? '#000'          : 'var(--label3)';
              btn.style.borderColor  = on ? 'var(--green)' : 'var(--separator)';
            }
          });
        }

        // Restaurar selector de compás
        document.querySelectorAll('#segCompas .seg-btn').forEach(b => {
          b.classList.toggle('active', b.textContent === state.compas);
        });

        window.rebuildScoreDisplay?.();
        window.showVoiceFeedback?.('✓ Sesión cargada');
      } catch (err) {
        notify('Error al cargar: ' + err.message, 'error');
      } finally {
        input.parentNode?.removeChild(input);
      }
    };
    reader.readAsText(file);
  };

  input.click();
  setTimeout(() => input.parentNode?.removeChild(input), 60000);
}

window.saveSession = saveSession;
window.loadSession = loadSession;
