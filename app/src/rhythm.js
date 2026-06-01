// src/rhythm.js
// Convierte la máscara de dedos en patrón rítmico (modelo DIDI).
// Referencia: Vázquez p.82 — subdivisión binaria.
//
//   Dedo EXTENDIDO = NOTA (corchea)
//   Dedo REPLEGADO = SILENCIO (corchea)
//
//   Mano DERECHA → tiempos impares (1 y 3)
//   Mano IZQUIERDA → tiempos pares (2 y 4)

import { state } from './state.js';

// ── Finger mask → patrón rítmico ──
export function fingerMaskToPattern(rightMask, leftMask, rightFist, leftFist, compas = '4/4', subdiv = '2') {
  const beatsMap = { '4/4':8, '2/4':4, '3/4':6, '6/8':6, '3/3':9 };
  const beats    = beatsMap[compas] || 8;
  const pattern  = Array(beats).fill(false);

  if (compas === '4/4') {
    if (!rightFist) {
      if (rightMask[0]) pattern[0] = true;
      if (rightMask[1]) pattern[1] = true;
      if (rightMask[2]) pattern[2] = true;
      if (rightMask[3]) pattern[3] = true;
    }
    if (!leftFist) {
      if (leftMask[3]) pattern[4] = true;
      if (leftMask[2]) pattern[5] = true;
      if (leftMask[1]) pattern[6] = true;
      if (leftMask[0]) pattern[7] = true;
    }

  } else if (compas === '2/4') {
    if (!rightFist) {
      if (rightMask[0]) pattern[0] = true;
      if (rightMask[1]) pattern[1] = true;
    }
    if (!leftFist) {
      if (leftMask[3]) pattern[2] = true;
      if (leftMask[2]) pattern[3] = true;
    }

  } else if (compas === '3/4') {
    if (!rightFist) {
      if (rightMask[0]) pattern[0] = true;
      if (rightMask[1]) pattern[1] = true;
      if (rightMask[2]) pattern[2] = true;
    }
    if (!leftFist) {
      if (leftMask[3]) pattern[3] = true;
      if (leftMask[2]) pattern[4] = true;
      if (leftMask[1]) pattern[5] = true;
    }

  } else if (compas === '6/8') {
    if (!rightFist) {
      if (rightMask[0]) pattern[0] = true;
      if (rightMask[1]) pattern[1] = true;
      if (rightMask[2]) pattern[2] = true;
    }
    if (!leftFist) {
      if (leftMask[3]) pattern[3] = true;
      if (leftMask[2]) pattern[4] = true;
      if (leftMask[1]) pattern[5] = true;
    }

  } else if (compas === '3/3') {
    // 3/3: captura en 3 pasos (9 slots, 3 por paso)
    const step        = state.threeThreeStep || 0;
    const accumulated = state.threeThreeAccum || Array(9).fill(false);

    for (let i = 0; i < 9; i++) {
      if (accumulated[i]) pattern[i] = true;
    }

    if (step === 0 && !rightFist) {
      if (rightMask[0]) pattern[0] = true;
      if (rightMask[1]) pattern[1] = true;
      if (rightMask[2]) pattern[2] = true;
    } else if (step === 1 && !leftFist) {
      if (leftMask[3]) pattern[3] = true;
      if (leftMask[2]) pattern[4] = true;
      if (leftMask[1]) pattern[5] = true;
    } else if (step === 2 && !rightFist) {
      if (rightMask[0]) pattern[6] = true;
      if (rightMask[1]) pattern[7] = true;
      if (rightMask[2]) pattern[8] = true;
    }
  }

  return pattern;
}

// Exponer globalmente
window.fingerMaskToPattern = fingerMaskToPattern;
