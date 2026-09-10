import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cropPlacement, regionFromCorners, containsPoint, constrainPoint, validateUpload } from './image-settings.ts';

test('cover crop preserves aspect ratio and reaches both pan limits without blank edges', () => {
  assert.deepEqual(cropPlacement(2000, 1000, 1, 0, 0), { x: -.5, y: 0, width: 2, height: 1 });
  assert.deepEqual(cropPlacement(2000, 1000, 1, 1, 0), { x: 0, y: 0, width: 2, height: 1 });
  assert.deepEqual(cropPlacement(1000, 2000, 2, -1, 1), { x: -1, y: 0, width: 2, height: 4 });
});
test('region selection supports drawing backwards and clamps to the image', () => {
  assert.deepEqual(regionFromCorners(.75, .75, .25, .25), { cx: .5, cy: .5, rx: .25, ry: .25 });
  const r = regionFromCorners(-1, -2, 2, 3);
  assert.deepEqual(r, { cx: .5, cy: .5, rx: .5, ry: .5 });
  assert.equal(regionFromCorners(.5, .5, .51, .51), null);
});
test('custom hit target ignores original mannequin coordinates', () => {
  const region = { cx: .8, cy: .25, rx: .12, ry: .15 };
  assert.equal(containsPoint(.8, .25, region), true);
  assert.equal(containsPoint(.3, .55, region), false);
  const point = constrainPoint(0, 1, region);
  assert.ok(containsPoint(point.x, point.y, region));
});
test('uploads reject unsupported, empty, and oversized files before decoding', () => {
  assert.equal(validateUpload({ type: 'image/png', size: 200 }), null);
  assert.equal(validateUpload({ type: 'image/jpeg', size: 200 }), null);
  assert.ok(validateUpload({ type: 'image/svg+xml', size: 200 }));
  assert.ok(validateUpload({ type: 'image/png', size: 0 }));
  assert.ok(validateUpload({ type: 'image/png', size: 21 * 1024 * 1024 }));
});
