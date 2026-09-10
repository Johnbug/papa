import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSlap } from './slap-synth.ts';

const rms = (samples: Float32Array) => Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length);
function brightness(samples: Float32Array) {
  let difference = 0, energy = 0;
  for (let i = 1; i < samples.length; i++) { difference += (samples[i] - samples[i - 1]) ** 2; energy += samples[i] ** 2; }
  return difference / energy;
}
await test('slaps contain a short audible transient with silent boundaries and headroom', () => {
  for (const rate of [22050, 44100, 48000]) {
    const samples = renderSlap(rate, 1, .65, 42);
    assert.ok(samples.length / rate >= .12 && samples.length / rate <= .3);
    assert.equal(samples[0], 0); assert.equal(samples.at(-1), 0);
    assert.ok(samples.every(v => Number.isFinite(v) && Math.abs(v) < .8));
    assert.ok(rms(samples) > .025);
    assert.ok(rms(samples.slice(-Math.floor(rate * .02))) < rms(samples.slice(0, Math.floor(rate * .04))) * .15);
  }
});
await test('stronger hits are louder without clipping', () => {
  assert.ok(rms(renderSlap(48000, 1.6, .65, 42)) > rms(renderSlap(48000, .6, .65, 42)) * 1.3);
});
await test('soft settings reduce sharp high frequencies', () => {
  assert.ok(brightness(renderSlap(48000, 1, 1, 42)) < brightness(renderSlap(48000, 1, 0, 42)) * .85);
});
await test('repeated hits vary their texture', () => {
  assert.notDeepEqual(renderSlap(48000, 1, .65, 42), renderSlap(48000, 1, .65, 43));
});
