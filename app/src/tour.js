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

// ─────────────────────────────────────────────
//  TUTORIALES CONTEXTUALES
// ─────────────────────────────────────────────

const TUTORIALS = {
  gesture: {
    title: '¿Cómo usar las señas?',
    icon: '✋',
    steps: [
      { title: 'Posicioná tu mano', desc: 'Mostrá la palma a la cámara a unos 30–50 cm. Buscá buena iluminación — el sistema necesita ver los dedos con claridad.' },
      { title: 'Cada dedo es una nota', desc: 'El índice, mayor, anular y meñique corresponden a las 4 notas del patrón. Pulgar no se usa. Dedo levantado = nota ON, dedo bajo = silencio.' },
      { title: 'Formá el patrón', desc: 'Combiná qué dedos están arriba para armar el ritmo que querés capturar. Podés cambiarlo en tiempo real mientras la cámara está activa.' },
      { title: 'Capturá cuando estés listo', desc: 'Cuando el pentagrama muestre el patrón correcto, apretá Capturar. Se guarda ese compás en la pista del instrumento seleccionado.' },
    ]
  },
  voice: {
    title: '¿Cómo usar comandos de voz?',
    icon: '🎤',
    steps: [
      { title: 'Activar el micrófono', desc: 'Apretá el botón "Voz" en la toolbar. El navegador te va a pedir permiso para usar el micrófono. Aceptá para continuar.' },
      { title: 'Comandos disponibles', desc: '"Capturar" — graba el compás actual. "Limpiar" — borra todo. "Tocar" — reproduce la partitura. "Stop" — detiene la reproducción.' },
      { title: 'Tip de uso', desc: 'Hablá claro y cerca del micrófono. El reconocimiento es local en el navegador, sin conexión a servidores externos.' },
    ]
  }
};

function showTutorial(type) {
  const tut = TUTORIALS[type];
  if (!tut) { startProductTour(); return; }

  // Si ya hay un modal abierto, lo cerramos
  document.getElementById('tutorialModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'tutorialModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:8000;background:rgba(0,0,0,0.85);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:20px;animation:tourFadeIn .25s';

  let currentStep = 0;

  function render() {
    const step = tut.steps[currentStep];
    modal.innerHTML = `
      <div style="background:linear-gradient(180deg,#1c1c28,#0a0a0f);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:28px 24px;max-width:360px;width:100%;box-shadow:0 24px 80px rgba(0,0,0,0.6);animation:tourSlideIn .3s cubic-bezier(0.34,1.56,0.64,1)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:24px">${tut.icon}</span>
            <div style="font-size:14px;font-weight:600;color:#fff">${tut.title}</div>
          </div>
          <button id="tutClose" style="background:transparent;border:none;color:rgba(255,255,255,0.4);font-size:18px;cursor:pointer;line-height:1;padding:4px">✕</button>
        </div>
        <div style="font-size:11px;color:#0a84ff;font-weight:600;letter-spacing:0.5px;margin-bottom:8px">PASO ${currentStep+1} DE ${tut.steps.length}</div>
        <div style="font-size:16px;font-weight:600;color:#fff;margin-bottom:8px;letter-spacing:-0.2px">${step.title}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.55;margin-bottom:20px">${step.desc}</div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;gap:4px">
            ${tut.steps.map((_, i) => `<div style="width:${i===currentStep?'18':'6'}px;height:6px;border-radius:3px;background:${i===currentStep?'#0a84ff':'rgba(255,255,255,0.15)'};transition:width .3s"></div>`).join('')}
          </div>
          <div style="display:flex;gap:6px">
            ${currentStep > 0 ? `<button id="tutBack" style="padding:7px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:rgba(255,255,255,0.85);font-size:12px;cursor:pointer;font-family:inherit">Atrás</button>` : ''}
            <button id="tutNext" style="padding:7px 16px;border-radius:8px;border:none;background:linear-gradient(135deg,#0a84ff,#5e5ce6);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 3px 10px rgba(10,132,255,0.3)">${currentStep===tut.steps.length-1?'Entendido ✓':'Siguiente →'}</button>
          </div>
        </div>
      </div>
    `;

    modal.querySelector('#tutClose').onclick = () => modal.remove();
    modal.querySelector('#tutNext').onclick  = () => {
      if (currentStep < tut.steps.length - 1) { currentStep++; render(); }
      else modal.remove();
    };
    modal.querySelector('#tutBack')?.addEventListener('click', () => { currentStep--; render(); });

    // Cerrar al click fuera
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  }

  injectTourCSS();
  render();
  document.body.appendChild(modal);
}

function showTutorialMenu() {
  document.getElementById('tutorialMenuModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'tutorialMenuModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:8000;background:rgba(0,0,0,0.85);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:20px;animation:tourFadeIn .25s';

  modal.innerHTML = `
    <div style="background:linear-gradient(180deg,#1c1c28,#0a0a0f);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:28px 24px;max-width:340px;width:100%;box-shadow:0 24px 80px rgba(0,0,0,0.6);animation:tourSlideIn .3s cubic-bezier(0.34,1.56,0.64,1)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div style="font-size:15px;font-weight:600;color:#fff">Ayuda y tutoriales</div>
        <button id="tmClose" style="background:transparent;border:none;color:rgba(255,255,255,0.4);font-size:18px;cursor:pointer;line-height:1;padding:4px">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button id="tm-gesture" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:#fff;font-family:inherit;cursor:pointer;text-align:left;transition:background .15s">
          <span style="font-size:22px">✋</span>
          <div><div style="font-size:13px;font-weight:600">Cómo usar las señas</div><div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px">Dedos, patrones y captura</div></div>
        </button>
        <button id="tm-voice" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:#fff;font-family:inherit;cursor:pointer;text-align:left;transition:background .15s">
          <span style="font-size:22px">🎤</span>
          <div><div style="font-size:13px;font-weight:600">Comandos de voz</div><div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px">Capturar, tocar, limpiar por voz</div></div>
        </button>
        <button id="tm-tour" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:#fff;font-family:inherit;cursor:pointer;text-align:left;transition:background .15s">
          <span style="font-size:22px">🗺️</span>
          <div><div style="font-size:13px;font-weight:600">Tour completo de la app</div><div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px">Recorrido paso a paso por todo</div></div>
        </button>
      </div>
    </div>
  `;

  injectTourCSS();
  document.body.appendChild(modal);

  modal.querySelector('#tmClose').onclick    = () => modal.remove();
  modal.querySelector('#tm-gesture').onclick = () => { modal.remove(); showTutorial('gesture'); };
  modal.querySelector('#tm-voice').onclick   = () => { modal.remove(); showTutorial('voice'); };
  modal.querySelector('#tm-tour').onclick    = () => {
    modal.remove();
    localStorage.removeItem('tour_done');
    startProductTour();
  };
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// Exponer globalmente
window.showTutorial     = showTutorial;
window.showTutorialMenu = showTutorialMenu;

// Exponer globalmente
window.startProductTour = startProductTour;
window.skipTour         = skipTour;
window.nextTourStep     = () => { tourCurrentStep++; renderTourStep(); };
window.prevTourStep     = () => { if (tourCurrentStep > 0) tourCurrentStep--; renderTourStep(); };
