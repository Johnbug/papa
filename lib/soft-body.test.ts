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
