import { renderSlap } from './slap-synth';

type Voice = { source: AudioBufferSourceNode; gain: GainNode; panner: StereoPannerNode };

export function createSlapAudio() {
  let context: AudioContext | null = null;
  let mix: DynamicsCompressorNode | null = null;
  let limiter: WaveShaperNode | null = null;
  let output: GainNode | null = null;
  const voices = new Set<Voice>();

  function initialize() {
    const ctx = new AudioContext();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -12; compressor.knee.value = 16; compressor.ratio.value = 3;
    compressor.attack.value = .002; compressor.release.value = .09;
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(4097);
    for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((i / (curve.length - 1) * 2 - 1) * 1.3);
    shaper.curve = curve; shaper.oversample = '2x';
    const gain = ctx.createGain(); gain.gain.value = .82;
    compressor.connect(shaper); shaper.connect(gain); gain.connect(ctx.destination);
    context = ctx; mix = compressor; limiter = shaper; output = gain;
    return ctx;
  }

  return {
    play(force: number, softness: number, pan: number) {
      try {
        const ctx = context ?? initialize();
        if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
        const t = ctx.currentTime;
        if (voices.size >= 8) {
          const oldest = voices.values().next().value!;
          oldest.gain.gain.setValueAtTime(1, t);
          oldest.gain.gain.linearRampToValueAtTime(0, t + .006);
          oldest.source.stop(t + .007); voices.delete(oldest);
        }
        const samples = renderSlap(ctx.sampleRate, force, softness, Math.floor(Math.random() * 0xffffffff));
        const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
        buffer.getChannelData(0).set(samples);
        const source = ctx.createBufferSource(); source.buffer = buffer;
        const gain = ctx.createGain();
        const panner = ctx.createStereoPanner(); panner.pan.value = Math.max(-.65, Math.min(.65, Number.isFinite(pan) ? pan : 0));
        source.connect(gain); gain.connect(panner); panner.connect(mix!);
        const voice = { source, gain, panner }; voices.add(voice);
        source.onended = () => { voices.delete(voice); source.disconnect(); gain.disconnect(); panner.disconnect(); };
        source.start(t);
      } catch { /* Audio remains optional if the browser cannot play it. */ }
    },
    dispose() {
      for (const voice of voices) {
        voice.source.onended = null;
        try { voice.source.stop(); } catch { /* It may already have ended. */ }
        voice.source.disconnect(); voice.gain.disconnect(); voice.panner.disconnect();
      }
      voices.clear(); mix?.disconnect(); limiter?.disconnect(); output?.disconnect();
      if (context) void context.close().catch(() => {});
      context = null; mix = null; limiter = null; output = null;
    },
  };
}
