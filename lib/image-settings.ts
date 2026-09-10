export type Region = { cx: number; cy: number; rx: number; ry: number };
export const DEFAULT_REGION: Region = { cx: .5, cy: .56, rx: .435, ry: .32 };
export type ImageFraming = { zoom: number; panX: number; panY: number };
export type ToyImage = { src: string; region: Region; custom: boolean; original?: ImageFraming & { src: string } };
export const DEFAULT_IMAGE: ToyImage = { src: '/peach.png', region: DEFAULT_REGION, custom: false };
export const MODEL_IMAGE: ToyImage = { src: '/denim.png', region: { cx: .5, cy: .44, rx: .35, ry: .23 }, custom: false };
export function defaultSoftness(image: Pick<ToyImage, 'src' | 'custom'>) {
  return !image.custom && image.src === MODEL_IMAGE.src ? 28 : 68;
}
export const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
export function cropPlacement(width: number, height: number, zoom: number, panX: number, panY: number) {
  if (!(width > 0 && height > 0)) throw new Error('图片尺寸无效');
  const scale = clamp(zoom, 1, 3) / Math.min(width, height);
  const w = width * scale, h = height * scale;
  return { x: (1 - w) / 2 + clamp(panX, -1, 1) * (w - 1) / 2, y: (1 - h) / 2 + clamp(panY, -1, 1) * (h - 1) / 2, width: w, height: h };
}
export function regionFromCorners(x1: number, y1: number, x2: number, y2: number): Region | null {
  const left = Math.min(clamp(x1), clamp(x2)), top = Math.min(clamp(y1), clamp(y2));
  const right = Math.max(clamp(x1), clamp(x2)), bottom = Math.max(clamp(y1), clamp(y2));
  if (right - left < .1 || bottom - top < .1) return null;
  return { cx: (left + right) / 2, cy: (top + bottom) / 2, rx: (right - left) / 2, ry: (bottom - top) / 2 };
}
export function containsPoint(x: number, y: number, region: Region) {
  return region.rx > 0 && region.ry > 0 && ((x - region.cx) / region.rx) ** 2 + ((y - region.cy) / region.ry) ** 2 < 1;
}
export function regionWeight(x: number, y: number, region: Region) {
  const d = ((x - region.cx) / region.rx) ** 2 + ((y - region.cy) / region.ry) ** 2;
  return clamp((1 - d) * 4);
}
export function constrainPoint(x: number, y: number, region: Region) {
  const dx = (x - region.cx) / region.rx, dy = (y - region.cy) / region.ry;
  const length = Math.hypot(dx, dy), scale = length > .94 ? .94 / length : 1;
  return { x: region.cx + dx * scale * region.rx, y: region.cy + dy * scale * region.ry };
}
export type UploadError = 'invalidType' | 'emptyFile' | 'oversizedFile';
export function validateUpload(file: { type: string; size: number }): UploadError | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'invalidType';
  if (file.size === 0) return 'emptyFile';
  if (file.size > 20 * 1024 * 1024) return 'oversizedFile';
  return null;
}
