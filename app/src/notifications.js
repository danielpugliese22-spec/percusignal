// src/notifications.js
// Sistema de notificaciones toast y modales estilo Apple.
// Reemplaza los alert() y confirm() nativos del browser.

// ── Toast notification ──
export function notify(msg, type = 'info', duration = 3500) {
  const colors = {
    info:    { bg: 'rgba(28,28,30,0.95)', border: 'rgba(255,255,255,0.1)',  icon: 'ℹ️' },
    success: { bg: 'rgba(30,50,30,0.95)', border: 'rgba(48,209,88,0.3)',   icon: '✓' },
    warning: { bg: 'rgba(50,40,20,0.95)', border: 'rgba(255,159,10,0.3)',  icon: '⚠️' },
    error:   { bg: 'rgba(50,20,20,0.95)', border: 'rgba(255,69,58,0.3)',   icon: '✕' },
  };
  const c = colors[type] || colors.info;

  // Stack: desplazar toasts existentes
  document.querySelectorAll('.ps-toast').forEach(t => {
    t.style.transform = (t.style.transform || '').replace(/translateY\([^)]+\)/, '') +
      ' translateY(-54px)';
  });

  const toast = document.createElement('div');
  toast.className = 'ps-toast';
  toast.style.cssText = `
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(0);
    background:${c.bg}; border:1px solid ${c.border};
    border-radius:14px; padding:12px 18px;
    display:flex; align-items:center; gap:10px;
    font-family:var(--font,-apple-system,sans-serif); font-size:14px; color:#fff;
    z-index:9999; min-width:220px; max-width:380px;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
    animation:toastIn .3s cubic-bezier(.34,1.56,.64,1);
    backdrop-filter:blur(20px);
  `;
  toast.innerHTML = `<span style="font-size:16px;flex-shrink:0">${c.icon}</span><span style="flex:1;line-height:1.4">${msg}</span>`;

  if (!document.getElementById('ps-toast-css')) {
    const s = document.createElement('style');
    s.id = 'ps-toast-css';
    s.textContent = `
      @keyframes toastIn  { from { opacity:0; transform:translateX(-50%) translateY(16px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
      @keyframes toastOut { from { opacity:1; } to { opacity:0; transform:translateX(-50%) translateY(8px); } }
    `;
    document.head.appendChild(s);
  }

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut .25s forwards';
    setTimeout(() => toast.remove(), 260);
  }, duration);
}

// ── Modal de confirmación (reemplaza confirm()) ──
export function confirmModal(title, message, { okText = 'Confirmar', cancelText = 'Cancelar', danger = false } = {}) {
  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,0.75);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML = `
      <div style="background:#1c1c1e;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;max-width:360px;width:100%;text-align:center">
        <h3 style="font-size:17px;font-weight:600;margin:0 0 8px;color:#fff">${title}</h3>
        <p style="font-size:14px;color:rgba(255,255,255,0.65);margin:0 0 20px;line-height:1.5">${message}</p>
        <div style="display:flex;gap:8px">
          <button id="ps-modal-cancel" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(255,255,255,0.7);font-size:14px;cursor:pointer;font-family:inherit">${cancelText}</button>
          <button id="ps-modal-ok" style="flex:1;padding:10px;border-radius:10px;border:none;background:${danger ? '#ff453a' : '#0a84ff'};color:#fff;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit">${okText}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#ps-modal-ok').onclick     = () => { modal.remove(); resolve(true); };
    modal.querySelector('#ps-modal-cancel').onclick = () => { modal.remove(); resolve(false); };
  });
}

// ── Prompt dialog (reemplaza prompt()) ──
export function promptDialog(title, message, { type = 'text', placeholder = '', okText = 'Aceptar' } = {}) {
  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,0.75);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML = `
      <div style="background:#1c1c1e;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;max-width:360px;width:100%">
        <h3 style="font-size:17px;font-weight:600;margin:0 0 6px;color:#fff">${title}</h3>
        <p style="font-size:13px;color:rgba(255,255,255,0.6);margin:0 0 14px">${message}</p>
        <input id="ps-prompt-input" type="${type}" placeholder="${placeholder}"
          style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:#fff;font-size:14px;font-family:inherit;box-sizing:border-box;outline:none;margin-bottom:14px"/>
        <div style="display:flex;gap:8px">
          <button id="ps-prompt-cancel" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(255,255,255,0.7);font-size:14px;cursor:pointer;font-family:inherit">Cancelar</button>
          <button id="ps-prompt-ok" style="flex:1;padding:10px;border-radius:10px;border:none;background:#0a84ff;color:#fff;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit">${okText}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const input = modal.querySelector('#ps-prompt-input');
    input.focus();
    const submit = () => { modal.remove(); resolve(input.value.trim()); };
    modal.querySelector('#ps-prompt-ok').onclick     = submit;
    modal.querySelector('#ps-prompt-cancel').onclick = () => { modal.remove(); resolve(null); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  });
}

// Exponer globalmente (muchos módulos hacen notify() sin importar)
window.notify       = notify;
window.confirmModal = confirmModal;
window.promptDialog = promptDialog;
