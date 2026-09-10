import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLocale, resolveLocale } from './locale.ts';
import { zh } from './locales/zh.ts';
import { en } from './locales/en.ts';
import { ja } from './locales/ja.ts';

await test('language resolution prioritizes links, then saved choices, then browser preference', () => {
  assert.equal(resolveLocale('ja', 'en', ['zh-CN']), 'ja');
  assert.equal(resolveLocale(null, 'en', ['zh-CN']), 'en');
  assert.equal(resolveLocale('bad', 'bad', ['fr-FR', 'ja-JP', 'en-US']), 'ja');
  assert.equal(resolveLocale(null, null, ['zh-TW']), 'zh');
  assert.equal(resolveLocale(null, null, ['fr-FR']), 'en');
  assert.equal(resolveLocale(null, null, []), 'en');
  assert.equal(normalizeLocale('EN_us'), 'en');
  assert.equal(normalizeLocale('<script>'), null);
});

await test('all three languages provide the same complete UI, error, and accessibility messages', () => {
  const keys = Object.keys(zh).sort();
  for (const translation of [zh, en, ja]) {
    assert.deepEqual(Object.keys(translation).sort(), keys);
    for (const [key, value] of Object.entries(translation)) {
      assert.equal(typeof value, 'string');
      assert.ok(key === 'scoreUnit' || value.trim().length > 0, `Empty translation: ${key}`);
    }
  }
});
