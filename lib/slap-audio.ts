export function createSlapAudio() {
  let context: AudioContext | null = null;
  return {
    play(force: number, softness: number, pan: number) {
      try {
        context ??= new AudioContext();
        if (context.state === 'suspended') void context.resume().catch(() => {});
        const ctx = context, t = ctx.currentTime;
        const gain = ctx.createGain(); gain.gain.setValueAtTime(Math.min(.55, force * .32), t); gain.gain.exponentialRampToValueAtTime(.001, t + .17);
        const panner = ctx.createStereoPanner(); panner.pan.value = Math.max(-.7, Math.min(.7, pan)); gain.connect(panner); panner.connect(ctx.destination);
        const tone = ctx.createOscillator(); tone.type = 'sine'; tone.frequency.setValueAtTime(180 - softness * 65, t); tone.frequency.exponentialRampToValueAtTime(48, t + .13); tone.connect(gain); tone.start(t); tone.stop(t + .19);
        const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * .065), ctx.sampleRate);
        const samples = buffer.getChannelData(0); for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * .012));
        const noise = ctx.createBufferSource(); noise.buffer = buffer;
        const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1100 + force * 600; filter.Q.value = .7; noise.connect(filter); filter.connect(gain); noise.start(t);
        tone.onended = () => { tone.disconnect(); noise.disconnect(); filter.disconnect(); gain.disconnect(); panner.disconnect(); };
      } catch { /* Audio is optional; the toy remains playable. */ }
    },
    dispose() { if (context) void context.close().catch(() => {}); context = null; },
  };
}
