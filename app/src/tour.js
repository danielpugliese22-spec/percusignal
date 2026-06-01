// src/tour.js
// Product tour interactivo con spotlight y tooltips.

const TOUR_STEPS = [
  {
    target: '#btnStart',
    title: '1. Activá la cámara',
    desc: 'Acá empieza todo. Cuando hagas click, el navegador te va a pedir permiso para usar la cámara. La IA detecta tus dedos 100% local — nada sale de tu dispositivo.',
    placement: 'right'
  },
  {
    target: '.fingers-row',
    title: '2. Mostrá tus dedos',
    desc: 'Cada dedo levantado = una nota. Dedo bajo = silencio. El sistema lee 4 dedos de cada mano (sin pulgar) para armar el ritmo.',
    placement: 'right'
  },
  {
    target: '.instr-grid',
    title: '3. Elegí un instrumento',
    desc: 'Seleccioná qué instrumento va a sonar con ese patrón. Podés tener varios instrumentos al mismo tiempo, cada uno con su ritmo independiente.',
    placement: 'right'
  },
  {
    target: '#btnCapture',
    title: '4. Capturá el compás',
    desc: 'Cuando estés conforme con lo que ves en el pentagrama, apretá Capturar. Se guarda ese compás en la pista del instrumento elegido.',
    placement: 'bottom'
  },
  {
    target: '#staffCanvas',
    title: '5. Tu partitura',
    desc: 'Acá se dibuja la notación en tiempo real. Podés capturar varios compases y armar una pieza completa. Click en cualquier compás para editarlo.',
    placement: 'top'
  },
  {
    target: '#btnPlay',
    title: '6. Reproducir',
    desc: 'Play reproduce todas las pistas juntas en loop, respetando el BPM. Podés silenciar instrumentos o activar el loop individual por pista.',
    placement: 'bottom'
  },
  {
    target: '.toolbar',
    title: '7. Compartir, guardar, exportar',
    desc: 'Compartir genera un link para enviar tu composición. Guardar/Cargar trabaja con archivos JSON. Exportar baja el audio como WAV.',
    placement: 'bottom'
  },
];

let tourCurrentStep = 0;
let tourTooltipEl   = null;

export function startProductTour() {
  if (localStorage.getItem('tour_done')) return;
  tourCurrentStep = 0;
  injectTourCSS();
  renderTourStep();
}

export function skipTour() {
  localStorage.setItem('tour_done', '1');
  cleanupTour();
}

function renderTourStep() {
  cleanupTour();
  if (tourCurrentStep >= TOUR_STEPS.length) { finishTour(); return; }

  const step   = TOUR_STEPS[tourCurrentStep];
  const target = document.querySelector(step.target);

  if (!target) {
    console.warn('[Tour] Target no encontrado:', step.target);
    tourCurrentStep++;
    setTimeout(renderTourStep, 100);
    return;
  }

  const rect = target.getBoundingClientRect();
  if (rect.top < 0 || rect.bottom > window.innerHeight) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => renderTourStepInternal(target, step), 400);
  } else {
    renderTourStepInternal(target, step);
  }
}

function renderTourStepInternal(target, step) {
  const rect = target.getBoundingClientRect();
  const pad  = 8;

  // Overlay con recorte
  const overlay = document.createElement('div');
  overlay.id = 'tourOverlay';
  overlay.style.cssText = `position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.75);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);pointer-events:auto;animation:tourFadeIn 0.3s ease-out;`;
  const top = rect.top - pad, left = rect.left - pad, right = rect.right + pad, bottom = rect.bottom + pad;
  overlay.style.clipPath = `polygon(0 0,100% 0,100% 100%,0 100%,0 ${top}px,${left}px ${top}px,${left}px ${bottom}px,${right}px ${bottom}px,${right}px ${top}px,0 ${top}px)`;
  overlay.onclick = () => { tourCurrentStep++; renderTourStep(); };
  document.body.appendChild(overlay);

  // Borde resaltado
  const highlight = document.createElement('div');
  highlight.id = 'tourHighlight';
  highlight.style.cssText = `position:fixed;top:${top}px;left:${left}px;width:${rect.width+pad*2}px;height:${rect.height+pad*2}px;border:2px solid #0a84ff;border-radius:12px;box-shadow:0 0 0 4px rgba(10,132,255,0.3),0 0 30px rgba(10,132,255,0.5);pointer-events:none;z-index:9001;animation:tourPulse 2s infinite,tourFadeIn 0.3s ease-out;`;
  document.body.appendChild(highlight);

  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'tourTooltip';
  tooltip.style.cssText = `position:fixed;z-index:9002;background:linear-gradient(180deg,#1c1c28,#0a0a0f);border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:18px 20px;max-width:320px;box-shadow:0 16px 50px rgba(0,0,0,0.6);color:#fff;font-family:var(--font,-apple-system,sans-serif);animation:tourSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1);`;
  tooltip.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div style="font-size:11px;color:#0a84ff;font-weight:600;letter-spacing:0.5px">PASO ${tourCurrentStep+1} DE ${TOUR_STEPS.length}</div>
      <button onclick="window.skipTour()" style="background:transparent;border:none;color:rgba(255,255,255,0.4);font-size:11px;cursor:pointer;font-family:inherit;padding:2px 6px">Saltar tour</button>
    </div>
    <h3 style="font-size:16px;font-weight:600;margin:0 0 8px;letter-spacing:-0.3px">${step.title}</h3>
    <p style="margin:0 0 16px;color:rgba(255,255,255,0.7);font-size:13px;line-height:1.5">${step.desc}</p>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
      <div style="display:flex;gap:4px">
        ${TOUR_STEPS.map((_, i) => `<div style="width:${i===tourCurrentStep?'18':'6'}px;height:6px;border-radius:3px;background:${i===tourCurrentStep?'#0a84ff':'rgba(255,255,255,0.15)'};transition:width .3s"></div>`).join('')}
      </div>
      <div style="display:flex;gap:6px">
        ${tourCurrentStep > 0 ? `<button onclick="window.prevTourStep()" style="padding:7px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:rgba(255,255,255,0.85);font-size:12px;cursor:pointer;font-family:inherit">Atrás</button>` : ''}
        <button onclick="window.nextTourStep()" style="padding:7px 16px;border-radius:8px;border:none;background:linear-gradient(135deg,#0a84ff,#5e5ce6);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 3px 10px rgba(10,132,255,0.3)">${tourCurrentStep===TOUR_STEPS.length-1?'¡Empezar! →':'Siguiente →'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(tooltip);
  tourTooltipEl = tooltip;

  // Posicionar tooltip
  setTimeout(() => {
    const tr    = tooltip.getBoundingClientRect();
    const mg    = 16;
    const place = step.placement || 'bottom';
    let ttTop, ttLeft;

    if (place === 'right')       { ttLeft = rect.right + mg;               ttTop  = rect.top + rect.height/2 - tr.height/2; }
    else if (place === 'left')   { ttLeft = rect.left - tr.width - mg;     ttTop  = rect.top + rect.height/2 - tr.height/2; }
    else if (place === 'top')    { ttTop  = rect.top - tr.height - mg;     ttLeft = rect.left + rect.width/2 - tr.width/2; }
    else                          { ttTop  = rect.bottom + mg;              ttLeft = rect.left + rect.width/2 - tr.width/2; }

    ttLeft = Math.max(12, Math.min(window.innerWidth  - tr.width  - 12, ttLeft));
    ttTop  = Math.max(12, Math.min(window.innerHeight - tr.height - 12, ttTop));

    tooltip.style.left = ttLeft + 'px';
    tooltip.style.top  = ttTop  + 'px';
  }, 50);
}

function cleanupTour() {
  document.getElementById('tourOverlay')?.remove();
  document.getElementById('tourHighlight')?.remove();
  document.getElementById('tourTooltip')?.remove();
}

function finishTour() {
  cleanupTour();
  localStorage.setItem('tour_done', '1');

  const final = document.createElement('div');
  final.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.85);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:20px;animation:tourFadeIn 0.3s';
  final.innerHTML = `
    <div style="background:linear-gradient(180deg,#1c1c28,#0a0a0f);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:32px 28px;max-width:380px;width:100%;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,0.6);animation:tourSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1)">
      <div style="font-size:54px;margin-bottom:10px">🥁</div>
      <h2 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#fff;letter-spacing:-0.3px">¡Listo para empezar!</h2>
      <p style="margin:0 0 20px;color:rgba(255,255,255,0.65);font-size:14px;line-height:1.5">Ya conocés todo lo importante. Cuando quieras volver a ver el tour, lo encontrás en el menú ?</p>
      <button id="tour-final-btn" style="padding:12px 28px;border-radius:12px;border:none;background:linear-gradient(135deg,#0a84ff,#5e5ce6);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 6px 20px rgba(10,132,255,0.4)">Activar cámara y empezar →</button>
    </div>
  `;
  document.body.appendChild(final);
  final.querySelector('#tour-final-btn').onclick = () => final.remove();
}

function injectTourCSS() {
  if (document.getElementById('tourCSS')) return;
  const style = document.createElement('style');
  style.id = 'tourCSS';
  style.textContent = `
    @keyframes tourFadeIn  { from { opacity:0; } to { opacity:1; } }
    @keyframes tourSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes tourPulse   {
      0%,100% { box-shadow:0 0 0 4px rgba(10,132,255,0.3),0 0 30px rgba(10,132,255,0.5); }
      50%     { box-shadow:0 0 0 8px rgba(10,132,255,0.15),0 0 40px rgba(10,132,255,0.7); }
    }
    @media (max-width:640px) {
      #tourTooltip { max-width:calc(100vw - 24px)!important; left:12px!important; right:12px!important; bottom:12px!important; top:auto!important; width:auto!important; }
    }
  `;
  document.head.appendChild(style);
}

window.addEventListener('resize', () => { if (tourTooltipEl) renderTourStep(); });

// Exponer globalmente
window.startProductTour = startProductTour;
window.skipTour         = skipTour;
window.nextTourStep     = () => { tourCurrentStep++; renderTourStep(); };
window.prevTourStep     = () => { if (tourCurrentStep > 0) tourCurrentStep--; renderTourStep(); };
