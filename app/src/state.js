// src/state.js
// Estado global de PercuSignal — única fuente de verdad
// Importado por todos los módulos que necesiten leer o escribir estado.

export const state = {
  rightMask: [false, false, false, false],
  leftMask:  [false, false, false, false],
  rightFist: false,
  leftFist:  false,
  compas: '4/4',
  subdiv: '2',
  bpm: 100,

  // ── TRACKS — modelo multi-pista ──
  // tracks[instrId] = [ {pattern, compas, rightMask, leftMask, rightFist, leftFist}, ... ]
  // Cada instrumento tiene su propia pista independiente.
  // Al reproducir, se alinean por índice de compás.
  tracks: {},
  activeMeasure: -1,
  activeTrackInstr: null,

  audioCtx: null,
  fps: 0, frames: 0, lastFT: 0,
  cameraActive: false,
  lastCapture: 0,
  playing: false,
  stopRequested: false,
  pendingInsertAfter: -1,
  dragSrcIdx: undefined,

  // 3/3 multi-step
  threeThreeStep: 0,
  threeThreeAccum: null,

  // Playback
  playStartTime: null,
};

// Exponer globalmente para compatibilidad con audio.js (cargado como script clásico)
window.state = state;
