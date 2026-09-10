'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type PointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { type Impact } from '@/lib/soft-body';
import { DEFAULT_IMAGE, PINK_IMAGE, containsPoint, constrainPoint, type ToyImage } from '@/lib/image-settings';
import { createPeachRenderer } from '@/lib/peach-renderer';
import { createSlapAudio } from '@/lib/slap-audio';
import { beginGesture, moveGesture, finishGesture, type Gesture } from '@/lib/gesture';
import { imageKind, pointerKind, trackEvent, type InputKind } from '@/lib/analytics';
import { useI18n } from './i18n';

export type ToyHandle = { reset(): void };
type Burst = { id: number; x: number; y: number; text: string };
type ModelContext = { registerTool(tool: { name: string; description: string; inputSchema: object; annotations: object; execute(input: unknown): unknown }, options: { signal: AbortSignal }): void | Promise<void> };

export const PeachToy = forwardRef<ToyHandle, { softness: number; sound: boolean; image: ToyImage; onHit(): void }>(function PeachToy(props, ref) {
  const { t } = useI18n();
  const canvas = useRef<HTMLCanvasElement>(null);
  const options = useRef(props); options.current = props;
  const hits = useRef<Impact[]>([]);
  const press = useRef({ x: .5, y: .55, amount: 0, active: false, id: -1 });
  const renderer = useRef<ReturnType<typeof createPeachRenderer>>(null);
  const audio = useRef<ReturnType<typeof createSlapAudio> | null>(null);
  const wake = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const sequence = useRef(0);
  const movement = useRef({ x: .5, y: .5, time: 0, speed: 0 });
  const gesture = useRef<Gesture | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hitForce = useRef(1);
  const hand = useRef<HTMLImageElement>(null);
  const [handReady, setHandReady] = useState(false);
  const [showHand, setShowHand] = useState(false);
  useEffect(() => {
    const finePointer = matchMedia('(any-pointer: fine)');
    function updatePointer() { setShowHand(finePointer.matches); if (!finePointer.matches) setHandReady(false); }
    updatePointer(); finePointer.addEventListener('change', updatePointer);
    return () => finePointer.removeEventListener('change', updatePointer);
  }, []);
  const [handVisible, setHandVisible] = useState(false);

  function clearHold() { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = null; }
  function cancelGesture() { clearHold(); gesture.current = null; press.current.active = false; setPressing(false); }
  function positionHand(x: number, y: number, pointerType: string) {
    if (pointerType === 'touch') { setHandVisible(false); return; }
    setHandVisible(true);
    if (hand.current) { hand.current.style.left = `${x * 100}%`; hand.current.style.top = `${y * 100}%`; }
  }

  function slap(x: number, y: number, force = 1, input: InputKind = 'keyboard') {
    if (!containsPoint(x, y, options.current.image.region)) return false;
    hits.current = [...hits.current.slice(-7), { x, y, force, time: performance.now() / 1000 }];
    if (options.current.sound) {
      audio.current ??= createSlapAudio();
      audio.current.play(force, options.current.softness / 100, (x - .5) * 1.4);
    }
    const id = ++sequence.current;
    if (hand.current && !matchMedia('(prefers-reduced-motion: reduce)').matches) hand.current.animate([
      { transform: 'translate(-43%, -48%) rotate(-18deg) scale(1)' },
      { transform: 'translate(-43%, -43%) rotate(-34deg) scale(.88)', offset: .25 },
      { transform: 'translate(-43%, -48%) rotate(-18deg) scale(1)' },
    ], { duration: 230, easing: 'ease-out' });
    setBursts(b => [...b.slice(-5), { id, x, y, text: [t.hit1, t.hit2, t.hit3, t.hit4][id % 4] }]);
    trackEvent('toy_slap', { image: imageKind(options.current.image), input });
    options.current.onHit(); wake.current();
    return true;
  }
  const action = useRef(slap); action.current = slap;
  useImperativeHandle(ref, () => ({ reset() {
    cancelGesture();
    hits.current = []; press.current.active = false; press.current.amount = 0;
    setPressing(false); setBursts([]); wake.current();
  } }));

  useEffect(() => {
    const element = canvas.current!;
    let frame = 0, dead = false, lastFrame = 0;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    function draw(ms: number) {
      frame = 0;
      if (dead || document.hidden || !renderer.current) return;
      const dt = Math.min(.05, Math.max(.001, (ms - lastFrame) / 1000)); lastFrame = ms;
      const p = press.current;
      p.amount += ((p.active ? 1 : 0) - p.amount) * (1 - Math.exp(-dt * 20));
      hits.current = hits.current.filter(h => ms / 1000 - h.time < 3);
      renderer.current.draw(ms / 1000, hits.current, options.current.softness / 100, p, reduced.matches, options.current.image.region);
      if (hits.current.length || p.active || p.amount > .001) frame = requestAnimationFrame(draw);
    }
    wake.current = () => { if (!dead && !frame) frame = requestAnimationFrame(draw); };
    const image = new Image();
    image.onload = () => {
      if (dead) return;
      try { renderer.current = createPeachRenderer(element, image); setReady(!!renderer.current); wake.current(); }
      catch { setReady(false); }
    };
    image.src = props.image.src;
    const observer = new ResizeObserver(() => wake.current()); observer.observe(element);
    function visibility() { if (document.hidden) { cancelGesture(); setHandVisible(false); } else wake.current(); }
    function contextLost(e: Event) { e.preventDefault(); setReady(false); renderer.current = null; }
    document.addEventListener('visibilitychange', visibility);
    element.addEventListener('webglcontextlost', contextLost);
    return () => { dead = true; clearHold(); cancelAnimationFrame(frame); observer.disconnect(); image.onload = null; renderer.current?.dispose(); renderer.current = null; audio.current?.dispose(); audio.current = null; document.removeEventListener('visibilitychange', visibility); element.removeEventListener('webglcontextlost', contextLost); };
  }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try { void Promise.resolve(context.registerTool({
      name: 'pat_peach', description: 'Pat the left or right side of the current image once, with the same animation, sound and score update as clicking it.',
      inputSchema: { type: 'object', properties: { side: { type: 'string', enum: ['left', 'right'] } }, required: ['side'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        if (!input || typeof input !== 'object' || !('side' in input) || (input.side !== 'left' && input.side !== 'right') || Object.keys(input).length !== 1) throw new Error('side must be left or right');
        const region = options.current.image.region;
        flushSync(() => { action.current(region.cx + (input.side === 'left' ? -.5 : .5) * region.rx, region.cy, 1, 'agent'); });
        return { patted: true, side: input.side };
      },
    }, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional browser API. */ }
    return () => lifecycle.abort();
  }, []);

  function point(e: PointerEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  }
  function down(e: PointerEvent<HTMLButtonElement>) {
    if (!e.isPrimary || e.button !== 0 || gesture.current) return;
    const p = point(e);
    positionHand(p.x, p.y, e.pointerType);
    const speed = performance.now() - movement.current.time < 120 ? movement.current.speed : 0;
    if (!containsPoint(p.x, p.y, options.current.image.region)) return;
    hitForce.current = Math.min(1.6, .9 + speed * .11);
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = beginGesture(e.clientX, e.clientY, performance.now());
    press.current = { ...p, amount: 0, active: false, id: e.pointerId };
    clearHold();
    holdTimer.current = setTimeout(() => {
      if (!gesture.current) return;
      gesture.current.mode = 'knead'; press.current.active = true; setPressing(true); wake.current();
    }, 180);
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    const p = point(e), now = performance.now(), old = movement.current;
    positionHand(p.x, p.y, e.pointerType);
    movement.current = { ...p, time: now, speed: Math.hypot(p.x - old.x, p.y - old.y) / Math.max(.008, (now - old.time) / 1000) };
    if (gesture.current && e.pointerId === press.current.id) {
      moveGesture(gesture.current, e.clientX, e.clientY, now);
      if (gesture.current.mode === 'knead') { clearHold(); press.current.active = true; setPressing(true); }
      const constrained = constrainPoint(p.x, p.y, options.current.image.region);
      press.current.x = constrained.x; press.current.y = constrained.y; wake.current();
    }
  }
  function release(e: PointerEvent<HTMLButtonElement>) {
    if (e.pointerId !== press.current.id || !gesture.current) return;
    clearHold();
    const result = finishGesture(gesture.current, e.clientX, e.clientY, performance.now(), e.type !== 'pointerup');
    gesture.current = null;
    const p = press.current; p.active = false; setPressing(false);
    if (result === 'slap') { const hit = point(e); slap(hit.x, hit.y, hitForce.current, pointerKind(e.pointerType)); }
    if (result === 'knead') trackEvent('toy_knead', { image: imageKind(options.current.image), input: pointerKind(e.pointerType) });
    if (result === 'knead' && p.amount > .6) hits.current = [...hits.current.slice(-7), { x: p.x, y: p.y, time: performance.now() / 1000, force: p.amount * .6 }];
    if (e.pointerType === 'touch' || e.type !== 'pointerup') setHandVisible(false);
    wake.current();
  }
  const region = props.image.region;
  return <button className={`toy-button ${props.image.custom ? 'custom-image' : ''} ${ready ? '' : 'fallback'} ${pressing ? 'pressing' : ''} ${handReady ? 'has-hand' : ''}`} aria-label={t.toyLabel} onPointerEnter={e => { const p = point(e); positionHand(p.x, p.y, e.pointerType); }} onPointerLeave={() => setHandVisible(false)} onPointerDown={down} onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onClick={e => { if (e.detail === 0) slap(region.cx - region.rx * .4, region.cy); }}>
    <img src={props.image.src} className={`toy-image ${ready ? 'hidden' : ''}`} alt={props.image.custom ? t.customAlt : props.image.src === DEFAULT_IMAGE.src ? t.peachAlt : props.image.src === PINK_IMAGE.src ? t.pinkModelAlt : t.modelAlt} draggable={false} />
    <canvas ref={canvas} aria-hidden="true" />
    {props.image.custom && <span className="custom-region-guide" aria-hidden="true" style={{ left: `${(region.cx - region.rx) * 100}%`, top: `${(region.cy - region.ry) * 100}%`, width: `${region.rx * 200}%`, height: `${region.ry * 200}%` }} />}
    {showHand && <img ref={hand} src="/hand.png" className={`hand-cursor ${handVisible && handReady ? 'visible' : ''}`} alt="" aria-hidden="true" draggable={false} onLoad={() => setHandReady(true)} />}
    {bursts.map(b => <span key={b.id} className="hit-effect" aria-hidden="true" style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%` }} onAnimationEnd={e => { if (e.target === e.currentTarget) setBursts(old => old.filter(v => v.id !== b.id)); }}><span className="hit-ring" />{b.text}</span>)}
  </button>;
});
