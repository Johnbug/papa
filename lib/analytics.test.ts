import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trackEvent, imageKind } from './analytics.ts';

await test('tracking is optional on the server and without an analytics script', () => {
  assert.doesNotThrow(() => trackEvent('game_reset', { image: 'peach' }));
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  try { assert.doesNotThrow(() => trackEvent('game_reset', { image: 'peach' })); }
  finally { Reflect.deleteProperty(globalThis, 'window'); }
});

await test('events reach the initialized SDK with categorical image metadata', () => {
  const calls: unknown[] = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { va: (...args: unknown[]) => calls.push(args) } });
  try {
    trackEvent('toy_slap', { image: imageKind({ custom: true, src: 'blob:private-image' }), input: 'touch' });
    assert.deepEqual(calls, [['event', { name: 'toy_slap', data: { image: 'custom', input: 'touch' }, options: undefined }]]);
    assert.ok(!JSON.stringify(calls).includes('private-image'));
  } finally { Reflect.deleteProperty(globalThis, 'window'); }
});

await test('analytics errors cannot interrupt gameplay', () => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { va: () => { throw new Error('Blocked'); } } });
  try { assert.doesNotThrow(() => trackEvent('game_reset', { image: 'peach' })); }
  finally { Reflect.deleteProperty(globalThis, 'window'); }
});
