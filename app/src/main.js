/**
 * main.js — PercuSignal Fase 4.4 (corregido)
 * ─────────────────────────────────────────────────────────────────────────────
 * Solo importa los módulos ES que REALMENTE existen en app/src/.
 * audio.js, tour.js, onboarding.js, etc. siguen cargando como
 * globals vía <script> en el HTML — no los tocamos aquí.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import './styles.css';      // CSS principal
import './state.js';        // expone window.state — sin init, solo carga
import './instruments.js';  // expone window.INSTRUMENTS, muteState, etc.
import { initUX } from './ux.js';
import { initUI } from './ui.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

function bootstrap() {
  initUX();
  initUI();
  setTimeout(() => window.renderPlanBadge?.(), 0);
  console.info('[PercuSignal] Fase 4.4 activa ✓');
}