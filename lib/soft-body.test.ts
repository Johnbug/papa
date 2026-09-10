import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deform, isPeach, type Impact } from './soft-body.ts';

test('background clicks miss while both peach lobes accept hits', () => {
  assert.equal(isPeach(.3, .55), true);
  assert.equal(isPeach(.7, .55), true);
  assert.equal(isPeach(.02, .02), false);
  assert.equal(isPeach(.5, .98), false);
  assert.equal(isPeach(.5, .2), false);
  assert.equal(isPeach(.4, .8), true);
  assert.equal(isPeach(.4, .95), false);
});
const hit: Impact = { x: .3, y: .55, time: 0, force: 1 };
test('a hit deforms its own lobe more than the opposite side', () => {
  const near = deform(.3, .55, .06, [hit], .68);
  const far = deform(.8, .55, .06, [hit], .68);
  assert.ok(Math.hypot(...near) > .005);
  assert.ok(Math.hypot(...near) > Math.hypot(...far));
});
test('impacts decay to rest and keep image edges pinned', () => {
  assert.deepEqual(deform(.3, .55, 5, [hit], .68), [0, 0]);
  assert.deepEqual(deform(0, .5, .06, [hit], .68), [0, 0]);
});
test('rapid hits stay finite and deformation remains bounded', () => {
  const hits = Array.from({ length: 8 }, (_, i) => ({ ...hit, time: i * .01 }));
  for (let t = .08; t < 3; t += .05) {
    const d = deform(.35, .6, t, hits, 1);
    assert.ok(d.every(v => Number.isFinite(v) && Math.abs(v) <= .11));
  }
});

test('custom image deformation leaves all pixels outside its selected ellipse fixed', () => {
  const region = { cx: .75, cy: .3, rx: .15, ry: .2 };
  const impacts = [{ x: .72, y: .3, time: 0, force: 1 }];
  assert.deepEqual(deform(.5, .3, .08, impacts, .7, region), [0, 0]);
  assert.deepEqual(deform(.75, .7, .08, impacts, .7, region), [0, 0]);
  assert.ok(Math.hypot(...deform(.72, .3, .08, impacts, .7, region)) > .005);
});

await test('denim preset resists kneading more and settles sooner than the soft preset', async () => {
  const { defaultSoftness, DEFAULT_IMAGE, PINK_IMAGE, MODEL_IMAGE } = await import('./image-settings.ts');
  const { deformPress } = await import('./soft-body.ts');
  const firm = defaultSoftness(MODEL_IMAGE) / 100;
  const soft = defaultSoftness(PINK_IMAGE) / 100;
  assert.equal(defaultSoftness(PINK_IMAGE), defaultSoftness(DEFAULT_IMAGE));
  const region = MODEL_IMAGE.region;
  const press = { x: .32, y: .44, amount: 1 };
  assert.ok(Math.hypot(...deformPress(.32, .44, press, firm, region)) < Math.hypot(...deformPress(.32, .44, press, soft, region)) * .9);
  assert.ok(deformPress(.05, .05, press, soft, region).every(v => v === 0));
  const hits = [{ x: .32, y: .44, time: 0, force: 1 }];
  let firmTail = 0, softTail = 0;
  for (let time = .4; time < 1.4; time += .02) {
    firmTail += Math.hypot(...deform(.32, .44, time, hits, firm, region));
    softTail += Math.hypot(...deform(.32, .44, time, hits, soft, region));
  }
  assert.ok(firmTail < softTail);
});
