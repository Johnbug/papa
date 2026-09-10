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

await test('opting out suppresses custom events and pageview middleware even without storage', async () => {
  const { saveAnalyticsPreference, shouldSendAnalytics } = await import('./analytics-preferences.ts');
  const calls: unknown[] = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    va: (...args: unknown[]) => calls.push(args),
    get localStorage() { throw new Error('Storage blocked'); },
  } });
  try {
    saveAnalyticsPreference(false);
    assert.equal(shouldSendAnalytics(), false);
    trackEvent('game_reset', { image: 'peach' });
    assert.equal(calls.length, 0);
    saveAnalyticsPreference(true);
    assert.equal(shouldSendAnalytics(), true);
    trackEvent('game_reset', { image: 'peach' });
    assert.equal(calls.length, 1);
  } finally { Reflect.deleteProperty(globalThis, 'window'); }
});

await test('an opt-out in another tab overrides a previous opt-in on this page', async () => {
  const { saveAnalyticsPreference, shouldSendAnalytics } = await import('./analytics-preferences.ts');
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) },
  } });
  try {
    saveAnalyticsPreference(true);
    assert.equal(shouldSendAnalytics(), true);
    values.set('papa-analytics', 'off');
    assert.equal(shouldSendAnalytics(), false);
  } finally { Reflect.deleteProperty(globalThis, 'window'); }
});

await test('a rejected storage write still applies opt-out for the current page', async () => {
  const { saveAnalyticsPreference, shouldSendAnalytics } = await import('./analytics-preferences.ts');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    localStorage: { getItem: () => 'on', setItem: () => { throw new Error('Quota exceeded'); } },
  } });
  try {
    saveAnalyticsPreference(false);
    assert.equal(shouldSendAnalytics(), false);
  } finally { Reflect.deleteProperty(globalThis, 'window'); }
});

await test('pink and denim models have distinct categories for switches and presets', async () => {
  const { PINK_IMAGE, MODEL_IMAGE, defaultSoftness } = await import('./image-settings.ts');
  assert.equal(imageKind(PINK_IMAGE), 'shorts');
  assert.equal(imageKind(MODEL_IMAGE), 'denim');
  assert.notEqual(imageKind(PINK_IMAGE), imageKind(MODEL_IMAGE));
  assert.ok(defaultSoftness(PINK_IMAGE) > defaultSoftness(MODEL_IMAGE));
});
