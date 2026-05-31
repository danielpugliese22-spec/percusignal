// src/audio.js — Fase 4.2
// Motor de audio de PercuSignal.
// Depende de: state (window.state), INSTRUMENTS (window.INSTRUMENTS),
//             muteState, volumeState, loopState (window globals hasta Fase 4.3)

// ─── INIT ────────────────────────────────────────────────────────────────────
function initAudio() {
  if(!state.audioCtx) state.audioCtx = new (window.AudioContext||window.webkitAudioContext)();
}

// ─── INSTRUMENTOS SINTÉTICOS ─────────────────────────────────────────────────
function playSurdo(time, velocity=1.0) {
  const ctx = state.audioCtx;
  const master = ctx.createGain(); master.gain.value = velocity * 0.9;
  master.connect(ctx.destination);
  const o = ctx.createOscillator(), e = ctx.createGain();
  o.type='sine'; o.frequency.setValueAtTime(80,time); o.frequency.exponentialRampToValueAtTime(38,time+0.28);
  e.gain.setValueAtTime(1.1,time); e.gain.exponentialRampToValueAtTime(0.001,time+0.7);
  o.connect(e); e.connect(master); o.start(time); o.stop(time+0.75);
  // sub
  const o2=ctx.createOscillator(), e2=ctx.createGain();
  o2.type='sine'; o2.frequency.value=48;
  e2.gain.setValueAtTime(0.6,time); e2.gain.exponentialRampToValueAtTime(0.001,time+0.5);
  o2.connect(e2); e2.connect(master); o2.start(time); o2.stop(time+0.55);
  // transiente
  const buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.03),ctx.sampleRate);
  const d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  const ns=ctx.createBufferSource(), nf=ctx.createBiquadFilter(), ne=ctx.createGain();
  nf.type='lowpass'; nf.frequency.value=220;
  ne.gain.setValueAtTime(0.5,time); ne.gain.exponentialRampToValueAtTime(0.001,time+0.03);
  ns.buffer=buf; ns.connect(nf); nf.connect(ne); ne.connect(master); ns.start(time);
}

// ── Campana: tono metálico largo ──
function playCampana(time, velocity=1.0) {
  const ctx = state.audioCtx;
  const master = ctx.createGain(); master.gain.value = velocity * 0.55;
  master.connect(ctx.destination);
  [800,1600,2400,3200].forEach((freq,i) => {
    const o=ctx.createOscillator(), e=ctx.createGain();
    o.type='sine'; o.frequency.value=freq;
    const decay = 1.2 - i*0.2;
    e.gain.setValueAtTime(1/(i+1),time); e.gain.exponentialRampToValueAtTime(0.001,time+decay);
    o.connect(e); e.connect(master); o.start(time); o.stop(time+decay+0.05);
  });
}

// ── Clave: madera seca y brillante ──
function playClave(time, velocity=1.0) {
  const ctx = state.audioCtx;
  const master = ctx.createGain(); master.gain.value = velocity * 0.7;
  master.connect(ctx.destination);
  // Click de madera
  const buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.06),ctx.sampleRate);
  const d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length)**3;
  const ns=ctx.createBufferSource(), bf=ctx.createBiquadFilter(), ne=ctx.createGain();
  bf.type='bandpass'; bf.frequency.value=2800; bf.Q.value=8;
  ne.gain.setValueAtTime(1,time); ne.gain.exponentialRampToValueAtTime(0.001,time+0.06);
  ns.buffer=buf; ns.connect(bf); bf.connect(ne); ne.connect(master); ns.start(time);
  // Tono fundamental
  const o=ctx.createOscillator(), e=ctx.createGain();
  o.type='square'; o.frequency.value=1800;
  e.gain.setValueAtTime(0.3,time); e.gain.exponentialRampToValueAtTime(0.001,time+0.04);
  o.connect(e); e.connect(master); o.start(time); o.stop(time+0.06);
}

// ── Cajón: golpe grave + snap agudo ──
function playCajon(time, velocity=1.0) {
  const ctx = state.audioCtx;
  const master = ctx.createGain(); master.gain.value = velocity * 0.85;
  master.connect(ctx.destination);
  const o=ctx.createOscillator(), e=ctx.createGain();
  o.type='sine'; o.frequency.setValueAtTime(120,time); o.frequency.exponentialRampToValueAtTime(55,time+0.2);
  e.gain.setValueAtTime(1,time); e.gain.exponentialRampToValueAtTime(0.001,time+0.45);
  o.connect(e); e.connect(master); o.start(time); o.stop(time+0.5);
  const buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.08),ctx.sampleRate);
  const d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  const ns=ctx.createBufferSource(), nf=ctx.createBiquadFilter(), ne=ctx.createGain();
  nf.type='highpass'; nf.frequency.value=3500;
  ne.gain.setValueAtTime(0.6,time); ne.gain.exponentialRampToValueAtTime(0.001,time+0.08);
  ns.buffer=buf; ns.connect(nf); nf.connect(ne); ne.connect(master); ns.start(time);
}

// ── Semillas: shaker suave ──
function playSemillas(time, velocity=1.0) {
  const ctx = state.audioCtx;
  const master = ctx.createGain(); master.gain.value = velocity * 0.45;
  master.connect(ctx.destination);
  const dur = 0.12;
  const buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*dur),ctx.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++) {
    const env = Math.sin(Math.PI * i/d.length);
    d[i]=(Math.random()*2-1)*env;
  }
  const ns=ctx.createBufferSource(), nf=ctx.createBiquadFilter(), ne=ctx.createGain();
  nf.type='bandpass'; nf.frequency.value=6000; nf.Q.value=0.8;
  ne.gain.setValueAtTime(1,time); ne.gain.exponentialRampToValueAtTime(0.001,time+dur);
  ns.buffer=buf; ns.connect(nf); nf.connect(ne); ne.connect(master); ns.start(time);
}

// ── Dispatcher principal ──
function playInstrument(instrId, time, velocity=1.0) {
  playSample(instrId, time, velocity);
}

// ═══════════════════════════════════════════════════════════════
//  REPRODUCCIÓN — simultánea, con loop independiente por instrumento
//
//  Cada instrumento en loop repite su último patrón grabado
//  mientras los demás avanzan compás a compás.
//  El scheduler usa Web Audio clock para timing exacto (no setTimeout).
// ═══════════════════════════════════════════════════════════════
const _schedulers = {}; // instrId → { intervalId, nextBeatTime, patIdx }
// OR de todos los patrones para visualización
function buildCombinedPattern(byInstr, beats) {
  const out = Array(beats).fill(false);
  Object.values(byInstr).forEach(pat => pat?.forEach((v,i)=>{ if(v) out[i]=true; }));
  return out;
}


// ── SAMPLE BUFFERS ──

// ─── SAMPLE BUFFERS ──────────────────────────────────────────────────────────
const _sampleBuffers = {};
let _congaBuffer = null;

// Carga un sample desde /audio/{instrId}.wav (en lugar de base64 inline)
async function loadSampleBuffer(instrId) {
  if(_sampleBuffers[instrId]) return _sampleBuffers[instrId];
  initAudio();
  const res = await fetch(`/audio/${instrId}.wav`);
  const arr = await res.arrayBuffer();
  _sampleBuffers[instrId] = await state.audioCtx.decodeAudioData(arr);
  return _sampleBuffers[instrId];
}

async function loadCongaBuffer() {
  if(_congaBuffer) return _congaBuffer;
  initAudio();
  const res = await fetch('/audio/conga.wav');
  const arr = await res.arrayBuffer();
  _congaBuffer = await state.audioCtx.decodeAudioData(arr);
  return _congaBuffer;
}

async function prewarmAllSamples() {
  initAudio();
  if(state.audioCtx.state==='suspended') state.audioCtx.resume();
  await Promise.all(INSTRUMENTS.map(inst => loadSampleBuffer(inst.id).catch(()=>{})));
}

async function playSample(instrId, time, velocity=1.0) {
  if(muteState[instrId]) return;
  initAudio();
  if(state.audioCtx.state==='suspended') state.audioCtx.resume();
  try {
    const buf = await loadSampleBuffer(instrId);
    const src = state.audioCtx.createBufferSource();
    src.buffer = buf;
    const gain = state.audioCtx.createGain();
    const volMap = {conga:1.0, surdo:1.1, campana:0.7, clave:0.85, cajon:0.95, semillas:0.8};
    gain.gain.value = velocity * (volMap[instrId] || 1.0) * (volumeState[instrId] ?? 1.0);
    src.connect(gain);
    gain.connect(state.audioCtx.destination);
    src.start(Math.max(time, state.audioCtx.currentTime + 0.005));
  } catch(e) { console.warn('playSample', instrId, e); }
}

// Sonido de captura neutro (snap sintético, sin sample del quinto)
function playCaptureSnap() {
  try {
    initAudio();
    const ctx = state.audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime + 0.01;

    // Cuerpo: click percusivo (ruido filtrado, decay corto)
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buf;

    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 2200;
    bpf.Q.value = 0.8;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.55, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    noise.connect(bpf);
    bpf.connect(env);
    env.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.08);

    // Tono transitorio corto para dar "pitch" al snap
    const osc = ctx.createOscillator();
    const oscEnv = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
    oscEnv.gain.setValueAtTime(0.18, now);
    oscEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(oscEnv);
    oscEnv.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch(e) {}
}

function prewarmAudio() { prewarmAllSamples(); }

async function playConga(time, velocity=1.0) {
  initAudio();
  if(state.audioCtx.state==='suspended') state.audioCtx.resume();
  const buf = await loadCongaBuffer();
  const src = state.audioCtx.createBufferSource();
  src.buffer = buf;
  const gain = state.audioCtx.createGain();
  gain.gain.value = velocity;
  src.connect(gain);
  gain.connect(state.audioCtx.destination);
  // Programar en el tiempo exacto pedido (o ahora si ya pasó)
  const playAt = Math.max(time, state.audioCtx.currentTime + 0.005);
  src.start(playAt);
}

// Wrapper: downbeat ligeramente más fuerte que golpe normal
function playBeat(time, isDownbeat=false) {
  playConga(time, isDownbeat ? 1.0 : 0.82);
}

// ─── CLICK SOUND ─────────────────────────────────────────────────────────────
function playClickSound() {
  try {
    const ctx = state?.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if(!state?.audioCtx) state.audioCtx = ctx;
    
    // Generar un click corto con osc + decay rápido (sin samples)
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.06);
  } catch(e) { console.warn('Click sound:', e); }
}

// ── 2. METRÓNOMO VISUAL ──
// Un círculo pulsante que parpadea en cada tiempo del compás

// ─── EXPORT ──────────────────────────────────────────────────────────────────
async function exportAudio(format = 'wav') {
  if(!currentPlan().canSave) { showPaywall('save'); return; }
  
  const maxLen = maxTrackLen();
  if(maxLen === 0) { 
    notify('Primero capturá al menos un compás', 'warning'); 
    return; 
  }

  // Modal de loading
  const loading = document.createElement('div');
  loading.id = 'exportLoading';
  loading.style.cssText = 'position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,0.85);backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;padding:20px';
  loading.innerHTML = `
    <div style="background:linear-gradient(180deg,#1c1c28,#0a0a0f);border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:32px;max-width:380px;width:100%;text-align:center">
      <div style="font-size:48px;margin-bottom:14px">🎵</div>
      <h2 style="font-size:18px;font-weight:600;margin:0 0 8px;color:#fff">Renderizando audio...</h2>
      <p id="exportProgress" style="margin:0;color:rgba(255,255,255,0.6);font-size:13px">Preparando samples</p>
      <div style="margin-top:18px;height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden">
        <div id="exportBar" style="width:0%;height:100%;background:linear-gradient(90deg,#0a84ff,#5e5ce6);transition:width .2s"></div>
      </div>
    </div>
  `;
  document.body.appendChild(loading);

  try {
    // 1. Asegurar que todos los samples estén cargados
    document.getElementById('exportProgress').textContent = 'Cargando samples...';
    document.getElementById('exportBar').style.width = '10%';
    await prewarmAllSamples();

    // 2. Calcular duración total
    const beatDur = 60/state.bpm/2; // duración de cada 1/8 de tiempo
    const beatsPerMeasure = 8;       // 8 slots por compás
    const totalDuration = maxLen * beatsPerMeasure * beatDur + 1; // +1s de cola para que el último golpe no se corte
    
    document.getElementById('exportProgress').textContent = `Renderizando ${maxLen} compás${maxLen===1?'':'es'} (${totalDuration.toFixed(1)}s)...`;
    document.getElementById('exportBar').style.width = '30%';

    // 3. Crear OfflineAudioContext
    const sampleRate = 44100;
    const ctx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);
    
    // 4. Schedulear cada nota
    const volMap = {conga:1.0, surdo:1.1, campana:0.7, clave:0.85, cajon:0.95, semillas:0.8};
    
    for(let mi = 0; mi < maxLen; mi++) {
      const mStart = mi * beatsPerMeasure * beatDur;
      
      for(const inst of INSTRUMENTS) {
        if(muteState[inst.id]) continue;
        
        const track = state.tracks[inst.id] || [];
        let pat = track[mi]?.pattern;
        
        // Si está en loop y este compás no tiene pattern, usar el anterior
        if(!pat && loopState[inst.id]) {
          for(let p = mi-1; p >= 0; p--) {
            if(track[p]?.pattern) { pat = track[p].pattern; break; }
          }
        }
        if(!pat) continue;

        const buf = _sampleBuffers[inst.id];
        if(!buf) continue;

        pat.forEach((on, bi) => {
          if(!on) return;
          const time = mStart + bi * beatDur;
          const velocity = (bi === 0 || bi === 4) ? 1.0 : 0.82;
          
          const src = ctx.createBufferSource();
          src.buffer = buf;
          const gain = ctx.createGain();
          gain.gain.value = velocity * (volMap[inst.id] || 1.0);
          src.connect(gain);
          gain.connect(ctx.destination);
          src.start(time);
        });
      }
    }

    document.getElementById('exportBar').style.width = '60%';
    document.getElementById('exportProgress').textContent = 'Procesando audio...';

    // 5. Renderizar a buffer
    const renderedBuffer = await ctx.startRendering();
    
    document.getElementById('exportBar').style.width = '85%';
    document.getElementById('exportProgress').textContent = 'Generando archivo WAV...';

    // 6. Convertir buffer a WAV blob
    const wavBlob = audioBufferToWav(renderedBuffer);
    
    document.getElementById('exportBar').style.width = '100%';
    document.getElementById('exportProgress').textContent = '¡Listo!';

    // 7. Descargar
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().slice(0,16).replace('T','_').replace(':','-');
    a.download = `percusignal_${ts}.wav`;
    a.href = url;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setTimeout(() => loading.remove(), 500);
  } catch(e) {
    console.error('Export error:', e);
    loading.remove();
    notify('Error al exportar: ' + e.message, 'error');
  }
}

// Convierte un AudioBuffer a un Blob WAV
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  // Interleaved samples
  const length = buffer.length * numChannels * bytesPerSample;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);
  
  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);            // subchunk size
  view.setUint16(20, format, true);         // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);
  
  // Write interleaved samples
  let offset = 44;
  const channels = [];
  for(let i = 0; i < numChannels; i++) channels.push(buffer.getChannelData(i));
  
  for(let i = 0; i < buffer.length; i++) {
    for(let c = 0; c < numChannels; c++) {
      let s = Math.max(-1, Math.min(1, channels[c][i]));
      s = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(offset, s, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view, offset, str) {
  for(let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
