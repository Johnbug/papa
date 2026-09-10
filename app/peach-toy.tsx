'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type PointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { isPeach, type Impact } from '@/lib/soft-body';
import { createPeachRenderer } from '@/lib/peach-renderer';
import { createSlapAudio } from '@/lib/slap-audio';

export type ToyHandle = { reset(): void };
type Burst = { id: number; x: number; y: number; text: string };
type ModelContext = { registerTool(tool: { name: string; description: string; inputSchema: object; annotations: object; execute(input: unknown): unknown }, options: { signal: AbortSignal }): void | Promise<void> };

export const PeachToy = forwardRef<ToyHandle, { softness: number; sound: boolean; onHit(): void }>(function PeachToy(props, ref) {
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

  function slap(x: number, y: number, force = 1) {
    if (!isPeach(x, y)) return false;
    hits.current = [...hits.current.slice(-7), { x, y, force, time: performance.now() / 1000 }];
    if (options.current.sound) {
      audio.current ??= createSlapAudio();
      audio.current.play(force, options.current.softness / 100, (x - .5) * 1.4);
    }
    const id = ++sequence.current;
    setBursts(b => [...b.slice(-5), { id, x, y, text: ['啪！', '啵～', '啪叽', 'PAP!'][id % 4] }]);
    options.current.onHit(); wake.current();
    return true;
  }
  const action = useRef(slap); action.current = slap;
  useImperativeHandle(ref, () => ({ reset() {
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
      renderer.current.draw(ms / 1000, hits.current, options.current.softness / 100, p, reduced.matches);
      if (hits.current.length || p.active || p.amount > .001) frame = requestAnimationFrame(draw);
    }
    wake.current = () => { if (!dead && !frame) frame = requestAnimationFrame(draw); };
    const image = new Image(); image.src = '/peach.png';
    image.onload = () => {
      if (dead) return;
      try { renderer.current = createPeachRenderer(element, image); setReady(!!renderer.current); wake.current(); }
      catch { setReady(false); }
    };
    const observer = new ResizeObserver(() => wake.current()); observer.observe(element);
    function visibility() { if (document.hidden) { press.current.active = false; setPressing(false); } else wake.current(); }
    function contextLost(e: Event) { e.preventDefault(); setReady(false); renderer.current = null; }
    document.addEventListener('visibilitychange', visibility);
    element.addEventListener('webglcontextlost', contextLost);
    return () => { dead = true; cancelAnimationFrame(frame); observer.disconnect(); image.onload = null; renderer.current?.dispose(); renderer.current = null; audio.current?.dispose(); audio.current = null; document.removeEventListener('visibilitychange', visibility); element.removeEventListener('webglcontextlost', contextLost); };
  }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try { void Promise.resolve(context.registerTool({
      name: 'pat_peach', description: 'Pat the left or right side of the peach once, with the same animation, sound and score update as clicking it.',
      inputSchema: { type: 'object', properties: { side: { type: 'string', enum: ['left', 'right'] } }, required: ['side'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        if (!input || typeof input !== 'object' || !('side' in input) || (input.side !== 'left' && input.side !== 'right') || Object.keys(input).length !== 1) throw new Error('side must be left or right');
        flushSync(() => { action.current(input.side === 'left' ? .3 : .7, .55); });
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
    if (!e.isPrimary || e.button !== 0 || press.current.active) return;
    const p = point(e);
    const speed = performance.now() - movement.current.time < 120 ? movement.current.speed : 0;
    if (!slap(p.x, p.y, Math.min(1.6, .9 + speed * .11))) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = { ...p, amount: 0, active: true, id: e.pointerId }; setPressing(true);
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    const p = point(e), now = performance.now(), old = movement.current;
    movement.current = { ...p, time: now, speed: Math.hypot(p.x - old.x, p.y - old.y) / Math.max(.008, (now - old.time) / 1000) };
    if (press.current.active && e.pointerId === press.current.id) {
      press.current.x = Math.max(.12, Math.min(.88, p.x)); press.current.y = Math.max(.25, Math.min(.85, p.y)); wake.current();
    }
  }
  function release(e: PointerEvent<HTMLButtonElement>) {
    if (e.pointerId !== press.current.id || !press.current.active) return;
    const p = press.current; p.active = false; setPressing(false);
    if (p.amount > .6) hits.current = [...hits.current.slice(-7), { x: p.x, y: p.y, time: performance.now() / 1000, force: p.amount * .6 }];
    wake.current();
  }
  return <button className={`toy-button ${ready ? '' : 'fallback'} ${pressing ? 'pressing' : ''}`} aria-label="拍拍蜜桃，点击拍打，按住揉捏；键盘按空格或回车也可拍打" onPointerDown={down} onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onClick={e => { if (e.detail === 0) slap(.35, .55); }}>
    <img src="/peach.png" className={`toy-image ${ready ? 'hidden' : ''}`} alt="一个圆润、柔软的粉色蜜桃屁屁玩具" draggable={false} />
    <canvas ref={canvas} aria-hidden="true" />
    {bursts.map(b => <span key={b.id} className="hit-effect" aria-hidden="true" style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%` }} onAnimationEnd={e => { if (e.target === e.currentTarget) setBursts(old => old.filter(v => v.id !== b.id)); }}><span className="hit-ring" />{b.text}</span>)}
  </button>;
});
