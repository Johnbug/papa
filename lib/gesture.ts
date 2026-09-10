export type Gesture = { x: number; y: number; time: number; mode: 'pending' | 'knead' };
export function beginGesture(x: number, y: number, time: number): Gesture { return { x, y, time, mode: 'pending' }; }
export function moveGesture(gesture: Gesture, x: number, y: number, time: number): void {
  if (Math.hypot(x - gesture.x, y - gesture.y) > 8 || time - gesture.time >= 180) gesture.mode = 'knead';
}
export function finishGesture(gesture: Gesture, x: number, y: number, time: number, cancelled = false): 'slap' | 'knead' | 'none' {
  if (cancelled) return 'none';
  moveGesture(gesture, x, y, time);
  return gesture.mode === 'pending' ? 'slap' : 'knead';
}
