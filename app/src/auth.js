import { supabase } from './supabaseClient.js';

// ── Fix #5: parchear logout de forma SINCRÓNICA al importar el módulo ────────
// Corre antes de cualquier await, eliminando la race condition donde el usuario
// podría clickear "Salir" y ejecutar el logout viejo (sin Supabase signOut).
window.logout = async () => {
  try { localStorage.removeItem('percusignal_user'); } catch {}
  await supabase.auth.signOut();
  location.reload();
};

// ── Logo ─────────────────────────────────────────────────────────────────────
const LOGO_HTML = `
  <div style="display:flex;align-items:center;gap:12px;justify-content:center;margin-bottom:32px">
    <span style="font-size:22px;letter-spacing:-2px;color:#e8d5a3;font-family:'Space Mono',monospace">▌▌▌▌▌</span>
    <span style="font-size:13px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;color:#f0ede8;font-family:'Space Grotesk',sans-serif">PERCUSIGNAL</span>
  </div>
`;

// ── Estado del overlay ───────────────────────────────────────────────────────
let overlayEl = null;
let resolveAuth = null;

// ── Fix #1: sesión local válida (flujo club) ─────────────────────────────────
// Si el usuario llega desde /club/qlpm con un localStorage escrito por enterApp(),
// tiene email + plan + active_until vigente → no bloquear el app con el overlay.
function hasValidLocalSession() {
  try {
    const raw = localStorage.getItem('percusignal_user');
    if (!raw) return false;
    const u = JSON.parse(raw);
    if (!u.email || !u.plan || !u.active_until) return false;
    return new Date(u.active_until) > new Date();
  } catch {
    return false;
  }
}

// ── Crear y mostrar el overlay de auth ───────────────────────────────────────
function showAuthOverlay() {
  if (overlayEl) return;

  overlayEl = document.createElement('div');
  overlayEl.id = 'authOverlay';
  overlayEl.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:9000',
    'background:#0c0c0c',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'padding:20px',
    'font-family:"Space Mono",monospace',
  ].join(';');

  overlayEl.innerHTML = buildAuthHTML();
  document.body.appendChild(overlayEl);
  wireAuthEvents();
}

function buildAuthHTML(mode = 'default') {
  const magicSent = mode === 'magic-sent';
  const magicForm = mode === 'magic-form';
  return `
    <div style="width:100%;max-width:380px">
      ${LOGO_HTML}
      <div id="authCard" style="background:#111;border:1px solid #1a1a1a;padding:32px">
        ${magicSent ? buildMagicSentHTML() : magicForm ? buildMagicFormHTML() : buildDefaultHTML()}
      </div>
      <p style="text-align:center;margin-top:20px;font-size:10px;color:#333;letter-spacing:.04em">
        Al ingresar aceptás los
        <a href="/terminos" target="_blank" style="color:#444;text-decoration:underline">términos</a>
        y la
        <a href="/privacidad" target="_blank" style="color:#444;text-decoration:underline">privacidad</a>
      </p>
    </div>
  `;
}

function buildDefaultHTML() {
  return `
    <h2 style="font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:700;color:#f0ede8;margin:0 0 6px;letter-spacing:-.02em">Iniciar sesión</h2>
    <p style="font-size:11px;color:#555;margin:0 0 24px;letter-spacing:.03em">Accedé con tu cuenta de Google o con Magic Link</p>

    <button id="authGoogleBtn" style="
      width:100%;padding:11px 16px;
      border:1px solid #1a1a1a;background:#161616;
      color:#f0ede8;font-family:'Space Mono',monospace;
      font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
      cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;
      transition:border-color .15s
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Continuar con Google
    </button>

    <div style="display:flex;align-items:center;gap:10px;margin:20px 0">
      <div style="flex:1;height:1px;background:#1a1a1a"></div>
      <span style="font-size:10px;color:#333;letter-spacing:.06em">O</span>
      <div style="flex:1;height:1px;background:#1a1a1a"></div>
    </div>

    <button id="authMagicLinkBtn" style="
      width:100%;padding:11px 16px;
      border:1px solid #e8d5a3;background:#e8d5a3;
      color:#0c0c0c;font-family:'Space Mono',monospace;
      font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
      cursor:pointer;transition:opacity .15s
    ">Magic Link por Email</button>
  `;
}

function buildMagicFormHTML() {
  return `
    <h2 style="font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:700;color:#f0ede8;margin:0 0 6px;letter-spacing:-.02em">Magic Link</h2>
    <p style="font-size:11px;color:#555;margin:0 0 24px;letter-spacing:.03em">Ingresá tu email y te enviamos un link para acceder</p>

    <label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#555;margin-bottom:8px">Email</label>
    <input id="authEmailInput" type="email" placeholder="tu@email.com" autofocus
      style="
        width:100%;padding:10px 12px;box-sizing:border-box;
        background:#0c0c0c;border:1px solid #1a1a1a;
        color:#f0ede8;font-family:'Space Mono',monospace;font-size:13px;
        outline:none;transition:border-color .15s;margin-bottom:14px
      "
      onfocus="this.style.borderColor='#e8d5a3'"
      onblur="this.style.borderColor='#1a1a1a'"
    />

    <button id="authSendMagicBtn" style="
      width:100%;padding:11px 16px;
      border:1px solid #e8d5a3;background:#e8d5a3;
      color:#0c0c0c;font-family:'Space Mono',monospace;
      font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
      cursor:pointer;transition:opacity .15s;margin-bottom:12px
    ">Enviar Magic Link</button>

    <button id="authBackBtn" style="
      width:100%;padding:10px 16px;
      border:1px solid #1a1a1a;background:transparent;
      color:#555;font-family:'Space Mono',monospace;
      font-size:10px;letter-spacing:.06em;text-transform:uppercase;
      cursor:pointer
    ">← Volver</button>

    <p id="authEmailError" style="color:#c0392b;font-size:11px;margin:10px 0 0;display:none">
      Ingresá un email válido
    </p>
  `;
}

function buildMagicSentHTML() {
  return `
    <div style="text-align:center">
      <div style="font-size:36px;margin-bottom:16px">📬</div>
      <h2 style="font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:700;color:#f0ede8;margin:0 0 10px;letter-spacing:-.02em">Revisá tu email</h2>
      <p style="font-size:11px;color:#555;line-height:1.6;margin:0 0 24px;letter-spacing:.03em">
        Te enviamos un link de acceso.<br>Tocá el link en el email para ingresar.
      </p>
      <button id="authResendBtn" style="
        width:100%;padding:10px 16px;
        border:1px solid #1a1a1a;background:transparent;
        color:#555;font-family:'Space Mono',monospace;
        font-size:10px;letter-spacing:.06em;text-transform:uppercase;
        cursor:pointer;margin-bottom:8px
      ">Reenviar link</button>
      <button id="authBackBtn" style="
        width:100%;padding:10px 16px;
        border:none;background:transparent;
        color:#333;font-family:'Space Mono',monospace;
        font-size:10px;letter-spacing:.06em;text-transform:uppercase;
        cursor:pointer
      ">← Volver</button>
    </div>
  `;
}

// ── Wiring de eventos del overlay ────────────────────────────────────────────
function wireAuthEvents() {
  const card = overlayEl?.querySelector('#authCard');
  if (!card) return;

  card.addEventListener('click', async (e) => {
    const id = e.target.closest('button')?.id;
    if (!id) return;
    if (id === 'authGoogleBtn')    await handleGoogleLogin();
    else if (id === 'authMagicLinkBtn') renderCard('magic-form');
    else if (id === 'authSendMagicBtn') await handleMagicLink();
    else if (id === 'authBackBtn')      renderCard('default');
    else if (id === 'authResendBtn')    renderCard('magic-form');
  });

  const emailInput = card.querySelector('#authEmailInput');
  if (emailInput) {
    emailInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') await handleMagicLink();
    });
  }
}

function renderCard(mode) {
  if (!overlayEl) return;
  overlayEl.innerHTML = buildAuthHTML(mode);
  wireAuthEvents();
  if (mode === 'magic-form') overlayEl.querySelector('#authEmailInput')?.focus();
}

async function handleGoogleLogin() {
  const btn = overlayEl?.querySelector('#authGoogleBtn');
  if (btn) { btn.textContent = 'Redirigiendo...'; btn.disabled = true; }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: 'https://percusignal.com.ar/app/' }
  });
  if (error) {
    if (btn) { btn.textContent = 'Continuar con Google'; btn.disabled = false; }
    showAuthError('Error al conectar con Google. Intentá de nuevo.');
  }
}

async function handleMagicLink() {
  const input = overlayEl?.querySelector('#authEmailInput');
  const errEl = overlayEl?.querySelector('#authEmailError');
  const btn   = overlayEl?.querySelector('#authSendMagicBtn');

  const email = input?.value.trim() || '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (errEl) errEl.style.display = 'block';
    if (input) input.style.borderColor = '#c0392b';
    return;
  }

  if (btn) { btn.textContent = 'Enviando...'; btn.disabled = true; }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: 'https://percusignal.com.ar/app/' }
  });

  if (error) {
    if (btn) { btn.textContent = 'Enviar Magic Link'; btn.disabled = false; }
    showAuthError(error.message || 'No se pudo enviar el link. Intentá de nuevo.');
    return;
  }

  renderCard('magic-sent');
}

function showAuthError(msg) {
  const card = overlayEl?.querySelector('#authCard');
  if (!card) return;
  let errBanner = card.querySelector('#authErrorBanner');
  if (!errBanner) {
    errBanner = document.createElement('p');
    errBanner.id = 'authErrorBanner';
    errBanner.style.cssText = 'color:#c0392b;font-size:11px;margin:12px 0 0;letter-spacing:.03em';
    card.appendChild(errBanner);
  }
  errBanner.textContent = msg;
}

// ── Quitar overlay ───────────────────────────────────────────────────────────
function removeAuthOverlay() {
  if (overlayEl) { overlayEl.remove(); overlayEl = null; }
  if (resolveAuth) { resolveAuth(); resolveAuth = null; }
}

// ── Sincronizar sesión Supabase → localStorage (email + plan) ────────────────
// Async: espera el fetch a /api/get-user-plan antes de renderizar el badge.
// Así el primer render del badge ya tiene el plan correcto sin recargar.
async function syncSessionToLocalStorage(session) {
  if (!session?.user?.email) return;
  const email = session.user.email;

  // Paso 1: escribir email de inmediato para que getUser() no devuelva null
  // si algo falla en el paso 2.
  try {
    const raw = localStorage.getItem('percusignal_user');
    const u = raw ? JSON.parse(raw) : {};
    if (!u.email) {
      u.email = email;
      localStorage.setItem('percusignal_user', JSON.stringify(u));
    }
  } catch {}

  // Paso 2: obtener plan actualizado del servidor y persistir antes de renderizar.
  // Equivale al syncPlanInBackground() del inline script, pero ejecutado en el
  // orden correcto: ANTES de llamar renderPlanBadge(), no después.
  try {
    const res = await fetch('/api/get-user-plan?email=' + encodeURIComponent(email));
    if (res.ok) {
      const data = await res.json();
      // setUser() es global (inline script), escribe a localStorage Y dispara
      // refreshUIForCurrentPlan() → renderPlanBadge() + locks de instrumentos.
      if (typeof window.setUser === 'function') {
        window.setUser({
          email,
          plan: data.plan || 'free',
          active_until: data.active_until || null
        });
      } else {
        // Fallback si setUser aún no está disponible
        const raw2 = localStorage.getItem('percusignal_user');
        const u2 = raw2 ? JSON.parse(raw2) : {};
        u2.email = email;
        u2.plan = data.plan || 'free';
        u2.active_until = data.active_until || null;
        localStorage.setItem('percusignal_user', JSON.stringify(u2));
        window.renderPlanBadge?.();
      }
    } else {
      // Error de API: badge al menos muestra el email
      window.renderPlanBadge?.();
    }
  } catch (e) {
    console.warn('[auth] plan sync failed:', e.message);
    window.renderPlanBadge?.();
  }
}

// ── Parchar globals de sesión ────────────────────────────────────────────────
function injectSessionHeader(session) {
  // Fix #4: cuando hay sesión activa de Supabase, showLogin() no debe abrir
  // el modal de email-only — redirige al panel de usuario en su lugar.
  window.showLogin = () => {
    window.showUserPanel?.();
  };

  // logout ya está parchado a nivel módulo (fix #5); nada más que hacer acá.
  void session; // la sesión se usa solo en syncSessionToLocalStorage
}

// ── Escuchar cambios de estado de auth ───────────────────────────────────────
function listenAuthChanges() {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      // Await: el overlay no se quita ni la promesa se resuelve hasta que el plan
      // esté en localStorage, garantizando que el badge renderice correcto.
      await syncSessionToLocalStorage(session);
      injectSessionHeader(session);
      removeAuthOverlay();
      if (resolveAuth) { resolveAuth(session); resolveAuth = null; }
    } else if (event === 'SIGNED_OUT') {
      try { localStorage.removeItem('percusignal_user'); } catch {}
      location.reload();
    }
  });
}

// ── Punto de entrada principal ───────────────────────────────────────────────
export async function initAuth() {
  // Fix #1: excepción para el flujo del club.
  // enterApp() en club.html escribe {email, plan, active_until} en localStorage
  // ANTES de redirigir a /app/. Si esa sesión local es válida (active_until en
  // el futuro), el usuario ya pasó por el check del club → no bloquear con overlay.
  if (hasValidLocalSession()) {
    listenAuthChanges();
    // En background: si además tiene sesión Supabase (p.ej., se autenticó antes),
    // parchear showLogin para consistencia — sin bloquear el app.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) injectSessionHeader(session);
    }).catch(() => {});
    return null;
  }

  // Sin sesión local válida: chequear sesión Supabase activa
  // (incluye el callback de vuelta de OAuth/Magic Link).
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    // Await: esperar a que email + plan estén en localStorage antes de retornar,
    // así el badge se renderiza correcto en la primera pasada de tryRender().
    await syncSessionToLocalStorage(session);
    injectSessionHeader(session);
    listenAuthChanges();
    return session;
  }

  // Sin sesión de ningún tipo: mostrar overlay bloqueante.
  return new Promise((resolve) => {
    resolveAuth = resolve;
    showAuthOverlay();
    listenAuthChanges();
  });
}
