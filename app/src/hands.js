// src/hands.js
// Detección de dedos y dibujo del overlay de mano.
// Depende de MediaPipe Hands (cargado como script clásico desde CDN).

// ── Detecta si la mano es un puño cerrado ──
export function isFist(landmarks) {
  const tips  = [8, 12, 16, 20];
  const mcps  = [5,  9, 13, 17];
  const wrist = landmarks[0];
  const handSize = Math.hypot(
    landmarks[9].x - wrist.x,
    landmarks[9].y - wrist.y
  ) || 0.1;
  let closed = 0;
  for (let i = 0; i < 4; i++) {
    const tipBelowMcp = (landmarks[tips[i]].y - landmarks[mcps[i]].y) / handSize;
    if (tipBelowMcp > 0.10) closed++;
  }
  return closed >= 4;
}

// ── Detecta qué dedos están levantados (excluyendo pulgar) ──
// Retorna array de 4 bools: [índice, medio, anular, meñique]
export function detectFingers(landmarks) {
  const tips  = [8, 12, 16, 20];
  const pips  = [7, 11, 15, 19];
  const mcps  = [5,  9, 13, 17];
  const wrist = landmarks[0];

  const handSize = Math.hypot(
    landmarks[9].x - wrist.x,
    landmarks[9].y - wrist.y
  ) || 0.1;

  const mask = [false, false, false, false];

  for (let i = 0; i < 4; i++) {
    const tip = landmarks[tips[i]];
    const pip = landmarks[pips[i]];
    const mcp = landmarks[mcps[i]];

    const tipAbovePip = (pip.y - tip.y) / handSize;
    const tipAboveMcp = (mcp.y - tip.y) / handSize;

    // Umbral adaptado por dedo:
    // índice/medio: 0.15 | anular: 0.12 | meñique: 0.08
    const thresholds = [0.15, 0.15, 0.12, 0.08];
    const th = thresholds[i];

    mask[i] = tipAbovePip > th || (tipAboveMcp > 0.20 && tipAbovePip > 0.0);
  }

  // Corrección de falsos positivos: anular/meñique solos con señal débil → ignorar
  if (mask[2] && !mask[0] && !mask[1]) {
    const tipAbovePip = (landmarks[pips[2]].y - landmarks[tips[2]].y) / handSize;
    if (tipAbovePip < 0.18) mask[2] = false;
  }
  if (mask[3] && !mask[0] && !mask[1] && !mask[2]) {
    const tipAbovePip = (landmarks[pips[3]].y - landmarks[tips[3]].y) / handSize;
    if (tipAbovePip < 0.12) mask[3] = false;
  }

  return mask;
}

// ── Confianza basada en claridad de extensión ──
export function fingerConfidence(landmarks) {
  const tips = [8, 12, 16, 20];
  const pips = [7, 11, 15, 19];
  let conf = 0;
  for (let i = 0; i < 4; i++) {
    conf += Math.abs(landmarks[tips[i]].y - landmarks[pips[i]].y);
  }
  return Math.min(1, conf * 4);
}

// ── Dibujar overlay de mano sobre el canvas ──
export function drawHand(ctx, lm, w, h, mask4, isFistState, color = '#c8420a') {
  const conn = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17]
  ];

  const pt = (i) => ({ x: lm[i].x * w, y: lm[i].y * h });

  // Conexiones
  ctx.strokeStyle = isFistState ? 'rgba(255,255,255,0.3)' : color + 'bb';
  ctx.lineWidth   = 2;
  ctx.lineCap     = 'round';
  for (const [a, b] of conn) {
    ctx.beginPath();
    ctx.moveTo(pt(a).x, pt(a).y);
    ctx.lineTo(pt(b).x, pt(b).y);
    ctx.stroke();
  }

  // Landmarks
  for (let i = 0; i < 21; i++) {
    const { x, y } = pt(i);
    // Tips de dedos (sin pulgar, i=8,12,16,20)
    const tipIdx = [8, 12, 16, 20].indexOf(i);
    const isUp   = tipIdx !== -1 && mask4[tipIdx];

    ctx.beginPath();
    ctx.arc(x, y, tipIdx !== -1 ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = isUp ? color : (isFistState ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)');
    ctx.fill();
  }

  // Emoji si es puño
  if (isFistState) {
    ctx.font = `${Math.floor(w * 0.08)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✊', pt(0).x, pt(0).y - 20);
  }
}

// Exponer globalmente (el callback de MediaPipe se define en index.html)
window.isFist           = isFist;
window.detectFingers    = detectFingers;
window.fingerConfidence = fingerConfidence;
window.drawHand         = drawHand;
