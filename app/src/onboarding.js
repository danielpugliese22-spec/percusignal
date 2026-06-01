// src/onboarding.js
// Pantallas de bienvenida (3 pasos) y formulario de feedback.

import { getUser } from './auth.js';
import { notify } from './notifications.js';

// ── Onboarding (3 pantallas) ──
export function showOnboarding() {
  if (localStorage.getItem('onboarding_done')) return;

  let currentStep = 0;
  const steps = [
    {
      icon: '✋',
      title: 'Mostrá tu mano a la cámara',
      desc: 'La app detecta cuántos dedos levantás. Cada combinación genera un patrón rítmico diferente.',
      visual: `<div style="font-size:100px;animation:tutHand 1.5s infinite;text-align:center">✋</div>
               <div style="display:flex;gap:6px;justify-content:center;margin-top:14px">
                 ${[1,1,1,0,0].map((on,i)=>`<div style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;${on?'background:#0a84ff;color:#fff;box-shadow:0 0 12px rgba(10,132,255,0.5)':'background:rgba(10,132,255,0.1);color:#0a84ff;border:2px solid rgba(10,132,255,0.3)'}">${i+1}</div>`).join('')}
               </div>`
    },
    {
      icon: '🥁',
      title: 'Capturá ritmos con voz o gesto',
      desc: 'Decí "Ya" o clickeá Capturar. La app guarda el patrón y lo agrega al pentagrama.',
      visual: `<div style="display:flex;flex-direction:column;align-items:center;gap:14px">
                 <div style="font-family:monospace;font-size:18px;color:#0a84ff;font-style:italic">"Ya"</div>
                 <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#30d158,#5ec8ca);display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;box-shadow:0 0 30px rgba(48,209,88,0.5);animation:tutPop 0.4s both">✓</div>
                 <div style="background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.08);padding:8px;width:240px">
                   <div style="display:flex;gap:3px">
                     ${[1,0,1,0,1,1,0,1].map(on=>`<div style="flex:1;height:18px;border-radius:3px;${on?'background:linear-gradient(135deg,#0a84ff,#5e5ce6)':'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06)'}"></div>`).join('')}
                   </div>
                 </div>
               </div>`
    },
    {
      icon: '🎵',
      title: 'Componé multi-pista y reproducí',
      desc: 'Combiná hasta 6 instrumentos en simultáneo. Reproducí, exportá audio o compartí tu creación.',
      visual: `<div style="background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.08);padding:10px;width:260px">
                 ${['#ff6b6b','#c89a4a','#aaa'].map((c,row)=>`
                   <div style="display:flex;align-items:center;gap:8px;${row<2?'margin-bottom:6px':''}">
                     <div style="width:42px;color:${c};font-weight:600;font-size:10px">${['Conga','Clave','Camp'][row]}</div>
                     <div style="display:flex;gap:2px;flex:1">
                       ${[[1,0,1,0,1,1,0,1],[0,1,0,1,0,0,1,0],[1,0,0,1,1,0,0,0]][row].map((on,i)=>`<div style="flex:1;height:14px;border-radius:2px;${on?'background:linear-gradient(135deg,#0a84ff,#5e5ce6);animation:tutGlow 1.5s '+(i*0.1)+'s infinite':'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06)'}"></div>`).join('')}
                     </div>
                   </div>`).join('')}
               </div>`
    }
  ];

  const modal = document.createElement('div');
  modal.id = 'onboardingModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:5500;background:rgba(0,0,0,0.9);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .3s';

  function render() {
    const s = steps[currentStep];
    modal.innerHTML = `
      <style>
        @keyframes tutHand { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08) rotate(-5deg)} }
        @keyframes tutPop  { from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes tutGlow { 0%,100%{box-shadow:0 0 4px rgba(10,132,255,0.4)} 50%{box-shadow:0 0 16px rgba(10,132,255,0.8)} }
      </style>
      <div style="background:linear-gradient(180deg,#1c1c28,#0a0a0f);border:1px solid rgba(255,255,255,0.1);border-radius:20px;max-width:440px;width:100%;box-shadow:0 24px 80px rgba(0,0,0,0.6);overflow:hidden">
        <div style="padding:28px 24px 0;text-align:center">
          <div style="font-size:48px;margin-bottom:8px">${s.icon}</div>
          <h2 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#fff;letter-spacing:-0.3px">${s.title}</h2>
          <p style="margin:0 0 20px;color:rgba(255,255,255,0.65);font-size:14px;line-height:1.5">${s.desc}</p>
        </div>
        <div style="background:radial-gradient(circle at center,rgba(10,132,255,0.06),transparent 70%);padding:24px;min-height:180px;display:flex;align-items:center;justify-content:center">
          ${s.visual}
        </div>
        <div style="padding:16px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px">
          <div style="display:flex;gap:6px">
            ${steps.map((_,i) => `<div style="width:${i===currentStep?'24':'8'}px;height:8px;border-radius:4px;background:${i===currentStep?'#0a84ff':'rgba(255,255,255,0.15)'};transition:width .3s"></div>`).join('')}
          </div>
          <div style="display:flex;gap:8px">
            ${currentStep > 0
              ? '<button id="obBack" style="padding:9px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:rgba(255,255,255,0.85);font-size:13px;font-weight:500;cursor:pointer;font-family:inherit">Atrás</button>'
              : '<button id="obSkip" style="padding:9px 16px;border-radius:10px;border:none;background:transparent;color:rgba(255,255,255,0.4);font-size:13px;cursor:pointer;font-family:inherit">Saltar</button>'
            }
            <button id="obNext" style="padding:9px 20px;border-radius:10px;border:none;background:linear-gradient(135deg,#0a84ff,#5e5ce6);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(10,132,255,0.3)">
              ${currentStep === steps.length - 1 ? '¡Empezar! →' : 'Siguiente →'}
            </button>
          </div>
        </div>
      </div>
    `;
    modal.querySelector('#obNext').onclick = () => {
      if (currentStep < steps.length - 1) {
        currentStep++;
        render();
      } else {
        localStorage.setItem('onboarding_done', '1');
        modal.remove();
        setTimeout(() => { try { window.startProductTour?.(); } catch(e) { console.warn('tour:', e); } }, 500);
      }
    };
    modal.querySelector('#obBack')?.addEventListener('click', () => { currentStep--; render(); });
    modal.querySelector('#obSkip')?.addEventListener('click', () => {
      localStorage.setItem('onboarding_done', '1');
      modal.remove();
    });
  }

  render();
  document.body.appendChild(modal);
}

// ── Formulario de feedback ──
export function showFeedback() {
  const u = getUser();

  // Pausar voz si está activa
  const voiceWasActive = typeof window.voiceActive !== 'undefined' && window.voiceActive;
  if (voiceWasActive) { try { window.toggleVoice?.(); } catch(e) {} }

  document.getElementById('feedbackModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'feedbackModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:5000;background:rgba(0,0,0,0.85);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s';
  modal.innerHTML = `
    <div style="background:linear-gradient(180deg,#1c1c28,#0a0a0f);border:1px solid rgba(255,255,255,0.1);border-radius:20px;max-width:480px;width:100%;box-shadow:0 24px 80px rgba(0,0,0,0.6);overflow:hidden">
      <div style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:flex-start;gap:16px">
        <div>
          <div style="font-size:32px;margin-bottom:8px">💬</div>
          <h2 style="font-size:20px;font-weight:700;margin:0 0 4px;color:#fff">Tu opinión nos importa</h2>
          <p style="margin:0;color:rgba(255,255,255,0.6);font-size:13px">3 preguntas rápidas, lleva 1 minuto</p>
        </div>
        <button id="fb-close-x" style="width:32px;height:32px;border:none;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);border-radius:50%;cursor:pointer;font-size:16px">✕</button>
      </div>
      <div style="padding:20px 24px;max-height:60vh;overflow-y:auto">
        <div style="margin-bottom:20px">
          <label style="display:block;font-size:13px;font-weight:600;color:#fff;margin-bottom:6px">¿Qué te confundió o costó entender?</label>
          <textarea id="fbConfuse" rows="2" placeholder="Ej: no entendí qué hacía el botón loop..." style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:#fff;font-family:inherit;font-size:13px;box-sizing:border-box;resize:vertical"></textarea>
        </div>
        <div style="margin-bottom:20px">
          <label style="display:block;font-size:13px;font-weight:600;color:#fff;margin-bottom:6px">¿Qué feature usarías más?</label>
          <textarea id="fbFeature" rows="2" placeholder="Ej: capturar con voz mientras dirijo a mis alumnos..." style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:#fff;font-family:inherit;font-size:13px;box-sizing:border-box;resize:vertical"></textarea>
        </div>
        <div style="margin-bottom:20px">
          <label style="display:block;font-size:13px;font-weight:600;color:#fff;margin-bottom:6px">¿Pagarías por esta app? ¿Cuánto?</label>
          <textarea id="fbPay" rows="2" placeholder="Ej: sí, $5000 al mes me parece justo / no, sólo si tuviera X..." style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:#fff;font-family:inherit;font-size:13px;box-sizing:border-box;resize:vertical"></textarea>
        </div>
        <div style="margin-bottom:20px">
          <label style="display:block;font-size:13px;font-weight:600;color:#fff;margin-bottom:8px">¿Cómo calificarías la app del 1 al 5?</label>
          <div id="fbStars" style="display:flex;gap:6px;justify-content:center">
            ${[1,2,3,4,5].map(n => `<button data-star="${n}" style="background:transparent;border:none;font-size:32px;cursor:pointer;color:rgba(255,255,255,0.2);transition:color .15s;padding:4px">★</button>`).join('')}
          </div>
        </div>
        <div style="margin-bottom:8px">
          <label style="display:block;font-size:13px;font-weight:600;color:#fff;margin-bottom:6px">Tu email (opcional, para responderte)</label>
          <input type="email" id="fbEmail" value="${u?.email || ''}" placeholder="tu@email.com"
            style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:#fff;font-family:inherit;font-size:13px;box-sizing:border-box"/>
        </div>
      </div>
      <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.06);display:flex;gap:10px">
        <button id="fb-cancel" style="flex:1;padding:11px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:rgba(255,255,255,0.85);font-size:14px;font-weight:500;cursor:pointer;font-family:inherit">Cancelar</button>
        <button id="fbSubmit" style="flex:1;padding:11px;border-radius:10px;border:none;background:linear-gradient(135deg,#0a84ff,#5e5ce6);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(10,132,255,0.3)">Enviar feedback</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  let fbRating = 0;
  modal.querySelectorAll('#fbStars button').forEach(btn => {
    btn.onclick = () => {
      fbRating = parseInt(btn.dataset.star);
      modal.querySelectorAll('#fbStars button').forEach((b, i) => {
        b.style.color = i < fbRating ? '#ffd60a' : 'rgba(255,255,255,0.2)';
      });
    };
  });

  modal.querySelector('#fb-close-x').onclick = () => modal.remove();
  modal.querySelector('#fb-cancel').onclick  = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

  modal.querySelector('#fbSubmit').onclick = async () => {
    const data = {
      confuse:   modal.querySelector('#fbConfuse').value.trim(),
      feature:   modal.querySelector('#fbFeature').value.trim(),
      pay:       modal.querySelector('#fbPay').value.trim(),
      rating:    fbRating,
      email:     modal.querySelector('#fbEmail').value.trim(),
      timestamp: new Date().toISOString(),
      plan:      getUser()?.plan || 'free',
      userAgent: navigator.userAgent.substring(0, 100),
    };

    if (!data.confuse && !data.feature && !data.pay && !data.rating) {
      notify('Por favor completá al menos un campo', 'warning'); return;
    }

    const btn = modal.querySelector('#fbSubmit');
    btn.disabled = true; btn.textContent = 'Enviando...'; btn.style.opacity = '0.7';

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        modal.remove();
        notify('¡Gracias por tu feedback! 🙏', 'success', 4000);
      } else {
        throw new Error('Server error');
      }
    } catch {
      // Guardar offline para reintentar
      const stored = JSON.parse(localStorage.getItem('pending_feedback') || '[]');
      stored.push(data);
      localStorage.setItem('pending_feedback', JSON.stringify(stored));
      modal.remove();
      notify('Feedback guardado, se enviará automáticamente más tarde', 'info', 4000);
    }
  };
}

// ── Botón flotante de feedback ──
export function injectFeedbackFloat() {
  if (document.getElementById('feedbackFloatBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'feedbackFloatBtn';
  btn.title = 'Dejá tu opinión';
  btn.style.cssText = 'position:fixed;bottom:14px;right:14px;width:34px;height:34px;border-radius:50%;background:rgba(10,132,255,0.85);color:#fff;border:1px solid rgba(255,255,255,0.1);font-size:14px;cursor:pointer;box-shadow:0 4px 14px rgba(10,132,255,0.3);z-index:900;display:flex;align-items:center;justify-content:center;font-family:inherit;transition:all .15s;backdrop-filter:blur(10px);opacity:0.85';
  btn.innerHTML = '💬';
  btn.onmouseover = () => { btn.style.transform = 'scale(1.15)'; btn.style.opacity = '1'; };
  btn.onmouseout  = () => { btn.style.transform = 'scale(1)';    btn.style.opacity = '0.85'; };
  btn.onclick = () => showFeedback();
  document.body.appendChild(btn);
}

window.showOnboarding = showOnboarding;
window.showFeedback   = showFeedback;
window.injectFeedbackFloat = injectFeedbackFloat;
