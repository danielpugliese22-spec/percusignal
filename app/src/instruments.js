// src/instruments.js
// Definición de instrumentos, muteState, loopState y volumeState.
// Exporta todo como ES module Y lo expone en window para compatibilidad.

export const INSTRUMENTS = [
  { id:'conga',    name:'Quinto',   iconSmall:'C', color:'#c8420a', dim:'rgba(200,66,10,0.08)',
    emoji:'<svg viewBox="0 0 80 130" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cg-b-conga" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a1a1a"/><stop offset="0.5" stop-color="#a02525"/><stop offset="1" stop-color="#5a1a1a"/></linearGradient></defs><ellipse cx="40" cy="20" rx="28" ry="4" fill="#c89028"/><ellipse cx="40" cy="20" rx="28" ry="3.5" fill="none" stroke="#8a6028" stroke-width="0.4"/><ellipse cx="40" cy="19" rx="25" ry="3" fill="#f5ebd8"/><ellipse cx="40" cy="19" rx="25" ry="3" fill="none" stroke="#a89678" stroke-width="0.3"/><path d="M14 22 C12 50 16 90 22 110 L58 110 C64 90 68 50 66 22 Z" fill="url(#cg-b-conga)"/><path d="M19 25 C18 50 22 85 26 105" stroke="#d04040" stroke-width="1" fill="none" opacity="0.6"/><g fill="#c89028"><rect x="13" y="22" width="2" height="14" rx="0.5"/><rect x="24" y="22" width="2" height="16" rx="0.5"/><rect x="39" y="22" width="2" height="16" rx="0.5"/><rect x="54" y="22" width="2" height="16" rx="0.5"/><rect x="65" y="22" width="2" height="14" rx="0.5"/></g><ellipse cx="40" cy="110" rx="18" ry="3" fill="#2a0a0a"/></svg>' },
  { id:'surdo',    name:'Surdo',    iconSmall:'S', color:'#1a5c8a', dim:'rgba(26,92,138,0.08)',
    emoji:'<svg viewBox="0 0 80 130" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sd-b-surdo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a87340"/><stop offset="0.3" stop-color="#d4a574"/><stop offset="0.7" stop-color="#d4a574"/><stop offset="1" stop-color="#a87340"/></linearGradient><radialGradient id="sd-head-r" cx="0.5" cy="0.3" r="0.7"><stop offset="0" stop-color="#fff8e8"/><stop offset="0.7" stop-color="#e8dcc0"/><stop offset="1" stop-color="#a89878"/></radialGradient></defs><ellipse cx="40" cy="38" rx="34" ry="9" fill="#5a3818"/><ellipse cx="40" cy="36" rx="33" ry="7.5" fill="#8a5a28"/><ellipse cx="40" cy="34" rx="31" ry="6" fill="url(#sd-head-r)"/><ellipse cx="40" cy="34" rx="31" ry="6" fill="none" stroke="#5a3818" stroke-width="0.6"/><rect x="6" y="36" width="68" height="76" fill="url(#sd-b-surdo)"/><rect x="6" y="36" width="68" height="76" fill="none" stroke="#5a3818" stroke-width="0.5"/><rect x="6" y="108" width="68" height="4" fill="#3a2010"/><rect x="14" y="112" width="3" height="14" fill="#3a2010"/><rect x="63" y="112" width="3" height="14" fill="#3a2010"/></svg>' },
  { id:'campana',  name:'Campana',  iconSmall:'♪', color:'#b8860b', dim:'rgba(184,134,11,0.08)',
    emoji:'<svg viewBox="0 0 80 130" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cp-b-campana" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a1a1a"/><stop offset="0.4" stop-color="#3a3a3a"/><stop offset="0.7" stop-color="#1a1a1a"/><stop offset="1" stop-color="#0a0a0a"/></linearGradient></defs><g transform="rotate(-20 40 60)"><rect x="-2" y="58" width="44" height="5" rx="2.5" fill="#c89052"/><rect x="-2" y="58" width="44" height="2" fill="#e8c884" opacity="0.6"/></g><rect x="46" y="22" width="9" height="5" fill="#0a0a0a" rx="0.5"/><rect x="47" y="18" width="7" height="5" fill="#1a1a1a" rx="0.5"/><path d="M24 28 L56 28 L62 78 L18 78 Z" fill="url(#cp-b-campana)"/><path d="M18 78 L62 78 L60 82 L20 82 Z" fill="#000"/></svg>' },
  { id:'clave',    name:'Clave',    iconSmall:'K', color:'#3a7c3e', dim:'rgba(58,124,62,0.08)',
    emoji:'<svg viewBox="0 0 80 130" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cl-w-clave" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8c884"/><stop offset="0.5" stop-color="#c89a4a"/><stop offset="1" stop-color="#8a6428"/></linearGradient></defs><g transform="rotate(-12 40 60)"><rect x="32" y="20" width="14" height="80" rx="4" fill="url(#cl-w-clave)"/><ellipse cx="39" cy="48" rx="3.5" ry="5" fill="#3a2010"/></g><g transform="rotate(12 40 60)"><rect x="34" y="22" width="12" height="76" rx="6" fill="url(#cl-w-clave)"/></g></svg>' },
  { id:'cajon',    name:'Cajón',    iconSmall:'◼', color:'#6a3a8a', dim:'rgba(106,58,138,0.08)',
    emoji:'<svg viewBox="0 0 80 130" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cj-f-cajon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8c898"/><stop offset="1" stop-color="#a87a45"/></linearGradient></defs><path d="M58 24 L72 28 L72 100 L58 96 Z" fill="#3a2008"/><rect x="14" y="22" width="44" height="76" fill="url(#cj-f-cajon)"/><circle cx="25" cy="60" r="6" fill="#1a0a04"/><circle cx="25" cy="60" r="5" fill="#000"/></svg>' },
  { id:'semillas', name:'Shekeré',  iconSmall:'◉', color:'#5a7a2a', dim:'rgba(90,122,42,0.08)',
    emoji:'<svg viewBox="0 0 80 130" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sk-g-semillas" x1="0.3" y1="0.2" x2="0.7" y2="1"><stop offset="0" stop-color="#d4a564"/><stop offset="0.5" stop-color="#a06830"/><stop offset="1" stop-color="#5a3010"/></linearGradient></defs><path d="M36 14 Q34 22 35 32 L45 32 Q46 22 44 14 Z" fill="#5a3010"/><path d="M14 50 Q12 80 28 100 L52 100 Q68 80 66 50 Q60 42 40 42 Q20 42 14 50 Z" fill="url(#sk-g-semillas)"/><circle cx="22" cy="56" r="1.8" fill="#d83020"/><circle cx="40" cy="50" r="1.8" fill="#d83020"/><circle cx="58" cy="56" r="1.8" fill="#d83020"/><circle cx="40" cy="78" r="1.8" fill="#f0c020"/><circle cx="40" cy="88" r="1.8" fill="#2a9a3a"/></svg>' },
];

// Estados por instrumento
export const muteState   = Object.fromEntries(INSTRUMENTS.map(i => [i.id, false]));
export const loopState   = Object.fromEntries(INSTRUMENTS.map(i => [i.id, false]));
export const volumeState = Object.fromEntries(INSTRUMENTS.map(i => [i.id, 1.0]));

// Cargar volúmenes guardados
try {
  const saved = JSON.parse(localStorage.getItem('volumeState') || '{}');
  for (const id in saved) if (id in volumeState) volumeState[id] = saved[id];
} catch {}

export function setInstrumentVolume(instrId, val) {
  volumeState[instrId] = Math.max(0, Math.min(2, val));
  try { localStorage.setItem('volumeState', JSON.stringify(volumeState)); } catch {}
}

// Exponer en window para compatibilidad con código legacy
window.INSTRUMENTS        = INSTRUMENTS;
window.muteState          = muteState;
window.loopState          = loopState;
window.volumeState        = volumeState;
window.setInstrumentVolume = setInstrumentVolume;
window.activeInstrId      = 'conga';
