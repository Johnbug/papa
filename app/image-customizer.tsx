'use client';

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { ImagePlus, Move, Scan, SlidersHorizontal, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { clamp, cropPlacement, regionFromCorners, validateUpload, type Region, type ToyImage, type ImageFraming } from '@/lib/image-settings';

type Draft = { src: string; image: HTMLImageElement; owned: boolean };
type Drag = { id: number; x: number; y: number; panX: number; panY: number; region: Region };
const INITIAL_REGION: Region = { cx: .5, cy: .5, rx: .35, ry: .3 };

function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) reject(new Error('图片尺寸无效，请重新选择。'));
      else if (image.naturalWidth * image.naturalHeight > 40_000_000 || Math.max(image.naturalWidth, image.naturalHeight) > 16384) reject(new Error('图片分辨率过高，请缩小后重试。'));
      else resolve(image);
    };
    image.onerror = () => reject(new Error('无法读取这张图片，请尝试 JPG、PNG 或 WebP 格式。'));
    image.src = src;
  });
}

function Setting({ label, value, min, max, step = 1, onChange, disabled = false }: { label: string; value: number; min: number; max: number; step?: number; onChange(v: number): void; disabled?: boolean }) {
  return <label className="image-setting"><span>{label}</span><Slider aria-label={label} value={[value]} min={min} max={max} step={step} disabled={disabled} onValueChange={v => onChange(Array.isArray(v) ? v[0] : v)} /></label>;
}

export function ImageCustomizer({ current, onApply, secondaryActions }: { current: ToyImage; onApply(image: ToyImage): void; secondaryActions?: ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  const dialogInput = useRef<HTMLInputElement>(null);
  const draftRef = useRef<Draft | null>(null);
  const request = useRef(0);
  const drag = useRef<Drag | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('image');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [region, setRegion] = useState<Region>(INITIAL_REGION);

  function replaceDraft(next: Draft | null) {
    if (draftRef.current?.owned) URL.revokeObjectURL(draftRef.current.src);
    draftRef.current = next; setDraft(next);
  }
  function close() {
    request.current++; drag.current = null; setOpen(false); setBusy(false); setError(''); replaceDraft(null);
  }
  useEffect(() => () => { request.current++; if (draftRef.current?.owned) URL.revokeObjectURL(draftRef.current.src); }, []);

  function pickFile() { (open ? dialogInput.current : input.current)?.click(); }
  async function load(src: string, owned: boolean, initial: Region, framing: ImageFraming = { zoom: 1, panX: 0, panY: 0 }) {
    const ticket = ++request.current;
    setBusy(true); setError('');
    try {
      const image = await decodeImage(src);
      if (ticket !== request.current) { if (owned) URL.revokeObjectURL(src); return; }
      replaceDraft({ src, image, owned });
      setZoom(framing.zoom); setPan({ x: framing.panX, y: framing.panY }); setRegion(initial); setMode('image'); setOpen(true);
    } catch (e) {
      if (owned) URL.revokeObjectURL(src);
      if (ticket === request.current) setError(e instanceof Error ? e.message : '图片读取失败，请重试。');
    } finally { if (ticket === request.current) setBusy(false); }
  }
  function selectFile(file?: File) {
    if (!file) return;
    const problem = validateUpload(file);
    if (problem) { setError(problem); return; }
    void load(URL.createObjectURL(file), true, INITIAL_REGION);
  }
  const placement = draft ? cropPlacement(draft.image.naturalWidth, draft.image.naturalHeight, zoom, pan.x, pan.y) : { x: 0, y: 0, width: 1, height: 1 };

  function point(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: clamp((e.clientX - rect.left) / rect.width), y: clamp((e.clientY - rect.top) / rect.height) };
  }
  function startDrag(e: PointerEvent<HTMLDivElement>) {
    if (!e.isPrimary || e.button !== 0 || busy) return;
    const p = point(e);
    drag.current = { id: e.pointerId, ...p, panX: pan.x, panY: pan.y, region };
    e.currentTarget.setPointerCapture(e.pointerId); setError('');
  }
  function moveDrag(e: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.id !== e.pointerId || busy) return;
    const p = point(e);
    if (mode === 'image') setPan({
      x: placement.width > 1.001 ? clamp(start.panX + (p.x - start.x) * 2 / (placement.width - 1), -1, 1) : 0,
      y: placement.height > 1.001 ? clamp(start.panY + (p.y - start.y) * 2 / (placement.height - 1), -1, 1) : 0,
    });
    else { const next = regionFromCorners(start.x, start.y, p.x, p.y); if (next) setRegion(next); }
  }
  function endDrag(e: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== e.pointerId) return;
    if (e.type === 'pointerup') {
      moveDrag(e);
      if (mode === 'region') {
        const p = point(e);
        if (!regionFromCorners(drag.current.x, drag.current.y, p.x, p.y)) setError('选区太小了，请拖出稍大一点的范围。');
      }
    } else if (e.type === 'pointercancel') { setRegion(drag.current.region); setPan({ x: drag.current.panX, y: drag.current.panY }); }
    drag.current = null;
  }

  async function apply() {
    if (!draft || busy) return;
    const ticket = ++request.current;
    setBusy(true); setError('');
    let outputURL: string | null = null;
    try {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('浏览器暂时无法处理图片，请重试。');
      context.fillStyle = '#fff3ee'; context.fillRect(0, 0, 1024, 1024);
      context.drawImage(draft.image, placement.x * 1024, placement.y * 1024, placement.width * 1024, placement.height * 1024);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('图片处理失败，请换一张重试。')), 'image/png'));
      if (ticket !== request.current) return;
      outputURL = URL.createObjectURL(blob);
      onApply({ src: outputURL, region: { ...region }, custom: true, original: { src: draft.src, zoom, panX: pan.x, panY: pan.y } });
      draft.owned = false;
      close();
    } catch (e) { if (outputURL) URL.revokeObjectURL(outputURL); if (ticket === request.current) { setError(e instanceof Error ? e.message : '图片处理失败，请重试。'); setBusy(false); } }
  }

  function setRegionSize(axis: 'rx' | 'ry', value: number) {
    setRegion(r => axis === 'rx' ? { ...r, rx: value, cx: clamp(r.cx, value, 1 - value) } : { ...r, ry: value, cy: clamp(r.cy, value, 1 - value) });
  }

  return <div className="image-customizer">
    <input ref={input} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label="选择自定义图片" onChange={e => { selectFile(e.target.files?.[0]); e.target.value = ''; }} />
    <div className="image-actions">
      <button className="upload-button" onClick={pickFile} disabled={busy}><ImagePlus size={17} />{busy && !open ? '读取中…' : current.custom ? '换一张图片' : '上传自己的图片'}</button>
      {current.custom && <button className="image-text-button" disabled={busy} onClick={() => void load(current.original?.src ?? current.src, false, current.region, current.original)}><SlidersHorizontal size={15} />调整</button>}
      {secondaryActions}
    </div>
    <p className="image-privacy">仅在本机处理 · 不上传服务器 · 刷新后清除</p>
    {!open && error && <p role="alert" className="image-error">{error}</p>}
    <Dialog open={open} onOpenChange={value => { if (!value) close(); }}>
      <DialogContent className="image-dialog" showCloseButton={false}>
        <input ref={dialogInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label="更换自定义图片" onChange={e => { selectFile(e.target.files?.[0]); e.target.value = ''; }} />
        <DialogClose className="image-dialog-close" aria-label="关闭图片调整"><X size={20} /></DialogClose>
        <DialogTitle className="image-dialog-title">让你的图片动起来</DialogTitle>
        <DialogDescription className="image-dialog-description">调整构图，再圈出想拍的地方。图片会留在你的浏览器里。</DialogDescription>
        <Tabs value={mode} onValueChange={value => { drag.current = null; setMode(String(value)); setError(''); }} className="image-editor-tabs">
          <TabsList className="image-mode-tabs"><TabsTrigger value="image"><Move size={16} />1. 调整图片</TabsTrigger><TabsTrigger value="region"><Scan size={16} />2. 选择拍打区域</TabsTrigger></TabsList>
          <div className="image-editor-body">
            <div>
              <div className={`image-edit-surface ${mode === 'region' ? 'select-region' : ''}`} aria-label={mode === 'image' ? '拖动调整图片，或使用旁边的滑块' : '拖动圈选拍打区域，或使用旁边的滑块'} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}>
                {draft && <img src={draft.src} alt="自定义图片裁剪预览" draggable={false} style={{ left: `${placement.x * 100}%`, top: `${placement.y * 100}%`, width: `${placement.width * 100}%`, height: `${placement.height * 100}%` }} />}
                <div className={`region-outline ${mode === 'region' ? 'active' : ''}`} style={{ left: `${(region.cx - region.rx) * 100}%`, top: `${(region.cy - region.ry) * 100}%`, width: `${region.rx * 200}%`, height: `${region.ry * 200}%` }}><span>可拍打区域</span></div>
              </div>
              <p className="editor-help">{mode === 'image' ? '拖动图片调整位置，放大可移动更多范围。' : '从一个角拖到另一个角，圈出有弹性的部分。'}</p>
            </div>
            <div className="image-editor-settings">
              <TabsContent value="image">
                <h3>图片构图</h3>
                <Setting label="缩放" value={zoom} min={1} max={3} step={.01} onChange={setZoom} disabled={busy} />
                <Setting label="左右位置" value={pan.x} min={-1} max={1} step={.01} disabled={busy || placement.width <= 1.001} onChange={x => setPan(p => ({ ...p, x }))} />
                <Setting label="上下位置" value={pan.y} min={-1} max={1} step={.01} disabled={busy || placement.height <= 1.001} onChange={y => setPan(p => ({ ...p, y }))} />
                <button className="image-secondary-button" disabled={busy} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>重置构图</button>
                <p className="editor-tip">建议让主体尽量占满画面，效果更明显。</p>
              </TabsContent>
              <TabsContent value="region">
                <h3>拍打范围</h3>
                <Setting label="区域宽度" value={region.rx} min={.05} max={.5} step={.01} disabled={busy} onChange={v => setRegionSize('rx', v)} />
                <Setting label="区域高度" value={region.ry} min={.05} max={.5} step={.01} disabled={busy} onChange={v => setRegionSize('ry', v)} />
                <Setting label="区域左右" value={region.cx} min={region.rx} max={1 - region.rx} step={.01} disabled={busy || region.rx >= .5} onChange={cx => setRegion(r => ({ ...r, cx }))} />
                <Setting label="区域上下" value={region.cy} min={region.ry} max={1 - region.ry} step={.01} disabled={busy || region.ry >= .5} onChange={cy => setRegion(r => ({ ...r, cy }))} />
                <p className="editor-tip">椭圆内可以拍打和揉捏，外面的背景保持不动。</p>
              </TabsContent>
            </div>
          </div>
        </Tabs>
        {error && <p role="alert" className="image-error">{error}</p>}
        <div className="image-dialog-actions"><button className="image-secondary-button" disabled={busy} onClick={pickFile}>换一张</button><span>JPG / PNG / WebP · 最大 20 MB</span><button className="image-apply-button" disabled={busy || !draft} onClick={mode === 'image' ? () => setMode('region') : () => void apply()}>{busy ? '处理中…' : mode === 'image' ? '下一步：选区域' : '用这张，开始拍'}</button></div>
      </DialogContent>
    </Dialog>
  </div>;
}
