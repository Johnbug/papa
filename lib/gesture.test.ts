import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beginGesture, moveGesture, finishGesture } from './gesture.ts';

test('pointer down defers the slap until short release', () => {
  const gesture = beginGesture(100, 100, 1000);
  assert.equal(gesture.mode, 'pending');
  assert.equal(finishGesture(gesture, 101, 102, 1090), 'slap');
});
test('dragging immediately never produces a slap even when returning to the start', () => {
  const gesture = beginGesture(100, 100, 1000);
  moveGesture(gesture, 120, 100, 1010);
  moveGesture(gesture, 100, 100, 1020);
  assert.equal(finishGesture(gesture, 100, 100, 1030), 'knead');
});
test('holding without moving is kneading, not a click', () => {
  assert.equal(finishGesture(beginGesture(100, 100, 1000), 100, 100, 1250), 'knead');
});
test('release with movement but no intervening move event does not slap', () => {
  assert.equal(finishGesture(beginGesture(100, 100, 1000), 120, 100, 1020), 'knead');
});
test('cancelled gestures never produce an action', () => {
  assert.equal(finishGesture(beginGesture(100, 100, 1000), 100, 100, 1050, true), 'none');
});
