let audioCtx: AudioContext | null = null;
let masterCompressor: DynamicsCompressorNode | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
    
    // Compresor master para evitar saturación de picos en clics rápidos
    masterCompressor = audioCtx.createDynamicsCompressor();
    masterCompressor.threshold.setValueAtTime(-12, audioCtx.currentTime);
    masterCompressor.knee.setValueAtTime(6, audioCtx.currentTime);
    masterCompressor.ratio.setValueAtTime(4, audioCtx.currentTime);
    masterCompressor.attack.setValueAtTime(0.005, audioCtx.currentTime);
    masterCompressor.release.setValueAtTime(0.08, audioCtx.currentTime);
    masterCompressor.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function gainNodeToDestination(gainNode: GainNode) {
  if (audioCtx && masterCompressor) {
    gainNode.connect(masterCompressor);
  } else if (audioCtx) {
    gainNode.connect(audioCtx.destination);
  }
}

/**
 * Sonido de click de teclado mecánico ASMR (sintetizado de forma sutil).
 * @param isSpaceOrEnter Sonido más grave y con más cuerpo si es barra/intro.
 */
export function playKeyClick(isSpaceOrEnter: boolean = false) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const pitchFactor = 0.92 + Math.random() * 0.16; // Ligera variación aleatoria de pitch para realismo

    // 1. Ruido blanco de impacto amortiguado (keycap impact)
    const bufferSize = ctx.sampleRate * 0.015; // 15ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = isSpaceOrEnter ? 450 : 850 * pitchFactor;
    noiseFilter.Q.value = 2.0;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(isSpaceOrEnter ? 0.28 : 0.38, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    gainNodeToDestination(noiseGain);
    noiseSource.start(now);

    // 2. Resonancia del switch (cuerpo del sonido con onda triangular)
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'triangle';
    
    const bodyFreq = isSpaceOrEnter ? 100 : 190 * pitchFactor;
    bodyOsc.frequency.setValueAtTime(bodyFreq, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(bodyFreq * 0.8, now + 0.024);

    bodyGain.gain.setValueAtTime(isSpaceOrEnter ? 0.48 : 0.38, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.026);

    bodyOsc.connect(bodyGain);
    gainNodeToDestination(bodyGain);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.03);

  } catch (e) {
    console.debug('playKeyClick failed:', e);
  }
}

/**
 * Sonido whoosh para transiciones de elementos y caídas físicas.
 */
export function playWhoosh() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.45;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.5;
    filter.frequency.setValueAtTime(120, now);
    filter.frequency.exponentialRampToValueAtTime(1100, now + duration);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.12);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    
    if (masterCompressor) {
      gainNode.connect(masterCompressor);
    } else {
      gainNode.connect(ctx.destination);
    }

    noiseSource.start(now);
    noiseSource.stop(now + duration);
  } catch (e) {
    console.debug('playWhoosh failed:', e);
  }
}

/**
 * Alerta de éxito ASMR (un doble click mecánico sutil e intercalado).
 * Sin beeps ni sonidos electrónicos.
 */
export function playSuccessChime() {
  try {
    playKeyClick(true);
    setTimeout(() => {
      playKeyClick(false);
    }, 90);
  } catch (e) {
    console.debug('playSuccessChime synthesis failed:', e);
  }
}
