import { track } from '@vercel/analytics';
import { DEFAULT_IMAGE, type ToyImage } from './image-settings.ts';

type ImageKind = 'peach' | 'shorts' | 'custom';
export type InputKind = 'mouse' | 'touch' | 'pen' | 'keyboard' | 'agent' | 'unknown';
type Events = {
  toy_slap: { image: ImageKind; input: InputKind };
  toy_knead: { image: ImageKind; input: InputKind };
  image_change: { from: ImageKind; to: ImageKind };
  upload_click: { image: ImageKind; location: 'guide' | 'editor' };
  upload_selected: { accepted: boolean };
  image_error: { step: 'validation' | 'decode' | 'apply' };
  editor_open: { source: 'upload' | 'adjust' };
  editor_action: { action: 'adjust_click' | 'image_tab' | 'region_tab' | 'reset_crop' | 'apply_click' };
  editor_close: { outcome: 'applied' | 'cancelled' };
  image_applied: { source: 'upload' | 'adjust' };
  sound_toggle: { enabled: boolean; location: 'header' | 'controls' };
  softness_change: { value: number };
  game_reset: { image: ImageKind };
  home_click: { image: ImageKind };
};

// Only fixed categories are derived from images; URLs and file data never leave the editor.
export function imageKind(image: Pick<ToyImage, 'src' | 'custom'>): ImageKind {
  return image.custom ? 'custom' : image.src === DEFAULT_IMAGE.src ? 'peach' : 'shorts';
}
export function pointerKind(value: string): InputKind {
  return value === 'mouse' || value === 'touch' || value === 'pen' ? value : 'unknown';
}
export function trackEvent<Name extends keyof Events>(name: Name, properties: Events[Name]) {
  // The Vercel entry initializes the SDK. Other builds and SSR remain silent.
  try {
    if (typeof window !== 'undefined' && typeof window.va === 'function') track(name, properties);
  } catch { /* Analytics must never interrupt an interaction. */ }
}
