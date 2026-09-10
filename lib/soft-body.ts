import { DEFAULT_REGION, containsPoint, regionWeight, type Region } from './image-settings.ts';
export type Impact = { x: number; y: number; time: number; force: number };
export function isPeach(x: number, y: number): boolean {
  return containsPoint(x, y, DEFAULT_REGION);
}
export function deform(x: number, y: number, now: number, hits: Impact[], softness: number, region: Region = DEFAULT_REGION): [number, number] {
  const weight = regionWeight(x, y, region);
  if (weight <= 0) return [0, 0];
  const edge = Math.min(1, x * 12, (1 - x) * 12, y * 12, (1 - y) * 12);
  if (edge <= 0) return [0, 0];
  const scaleX = region.rx / .35, scaleY = region.ry / .23;
  const bx = .5 + (x - region.cx) / scaleX, by = .44 + (y - region.cy) / scaleY;
  let dx = 0, dy = 0;
  for (const h of hits) {
    const age = now - h.time;
    if (age < 0 || age > 3) continue;
    const s = Math.max(0, Math.min(1, softness));
    const decay = Math.exp(-age * (6 - s * 3));
    const wave = Math.sin(age * (24 - s * 10)) * decay;
    const squash = Math.exp(-age * 26) * .7 + wave * .48;
    const hx = .5 + (h.x - region.cx) / scaleX, hy = .44 + (h.y - region.cy) / scaleY;
    const rx = bx - hx, ry = by - hy;
    const local = Math.exp(-(rx * rx + ry * ry) / .026);
    const center = hx < .5 ? .32 : .68;
    const lobe = Math.exp(-((bx - center) ** 2 / .055 + (by - .44) ** 2 / .065));
    const force = h.force * (.7 + s * .55);
    dx += (-rx * squash * local + (bx - center) * wave * .25 * lobe) * force;
    dy += ((.042 * Math.exp(-age * 18) + .06 * wave) * local - (by - .44) * wave * .19 * lobe) * force;
  }
  return [Math.max(-.1, Math.min(.1, dx * scaleX)) * edge * weight, Math.max(-.1, Math.min(.1, dy * scaleY)) * edge * weight];
}
