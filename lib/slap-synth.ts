export function renderSlap(sampleRate: number, force: number, softness: number, seed: number) {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError('Unsupported sample rate');
  const strength = Math.max(.25, Math.min(1.8, Number.isFinite(force) ? force : 1));
  const soft = Math.max(0, Math.min(1, Number.isFinite(softness) ? softness : .65));
  const duration = .19 + soft * .035;
  const samples = new Float32Array(Math.ceil(sampleRate * duration));
  let random = (seed >>> 0) || 1;
  const variation = (random % 101) / 100;
  const contactPole = 1 - Math.exp(-2 * Math.PI * (3300 - 1900 * soft) / sampleRate);
  const bodyPole = 1 - Math.exp(-2 * Math.PI * (650 - 190 * soft) / sampleRate);
  const bassPole = 1 - Math.exp(-2 * Math.PI * 90 / sampleRate);
  let contact = 0, body = 0, bass = 0, phase = 0, peak = 0;

  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    random ^= random << 13; random ^= random >>> 17; random ^= random << 5;
    const noise = (random >>> 0) / 2147483648 - 1;
    contact += contactPole * (noise - contact);
    body += bodyPole * (noise - body);
    bass += bassPole * (body - bass);

    // A brief filtered contact, a rounded body, and a quiet secondary touch.
    const attack = 1 - Math.exp(-t / .0008);
    const contactEnvelope = attack * Math.exp(-t / (.011 + soft * .006));
    const bodyEnvelope = (1 - Math.exp(-t / .002)) * Math.exp(-t / (.031 + soft * .013));
    const basePitch = 103 - soft * 18 + variation * 9;
    phase += 2 * Math.PI * (basePitch + 32 * Math.exp(-t / .008)) / sampleRate;
    const roundedBody = (Math.sin(phase) * .2 + Math.sin(phase * 1.97) * .035 + (body - bass) * .9) * bodyEnvelope;
    const reboundTime = t - (.018 + soft * .009);
    const rebound = reboundTime > 0 ? (contact - body) * .16 * (1 - Math.exp(-reboundTime / .0015)) * Math.exp(-reboundTime / .009) : 0;
    const tailFade = Math.min(1, (samples.length - 1 - i) / (sampleRate * .014));
    const value = Math.tanh(((contact - bass) * contactEnvelope * 1.45 + roundedBody + rebound) * 1.8) * tailFade;
    samples[i] = value; peak = Math.max(peak, Math.abs(value));
  }
  const gain = (.2 + strength * .24) / Math.max(peak, .001);
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
  samples[0] = 0; samples[samples.length - 1] = 0;
  return samples;
}
