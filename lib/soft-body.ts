export type Impact = { x: number; y: number; time: number; force: number };
export function isPeach(x: number, y: number): boolean {
  return ((x - .5) / .435) ** 2 + ((y - .52) / .37) ** 2 < 1;
}
export function deform(x: number, y: number, now: number, hits: Impact[], softness: number): [number, number] {
  const edge = Math.min(1, x * 12, (1 - x) * 12, y * 12, (1 - y) * 12);
  if (edge <= 0) return [0, 0];
  let dx = 0, dy = 0;
  for (const h of hits) {
    const age = now - h.time;
    if (age < 0 || age > 3) continue;
    const s = Math.max(0, Math.min(1, softness));
    const decay = Math.exp(-age * (6 - s * 3));
    const wave = Math.sin(age * (24 - s * 10)) * decay;
    const squash = Math.exp(-age * 26) * .7 + wave * .48;
    const rx = x - h.x, ry = y - h.y;
    const local = Math.exp(-(rx * rx + ry * ry) / .026);
    const center = h.x < .5 ? .32 : .68;
    const lobe = Math.exp(-((x - center) ** 2 / .07 + (y - .55) ** 2 / .16));
    const force = h.force * (.7 + s * .55);
    dx += (-rx * squash * local + (x - center) * wave * .25 * lobe) * force;
    dy += ((.042 * Math.exp(-age * 18) + .06 * wave) * local - (y - .55) * wave * .19 * lobe) * force;
  }
  return [Math.max(-.1, Math.min(.1, dx)) * edge, Math.max(-.1, Math.min(.1, dy)) * edge];
}
