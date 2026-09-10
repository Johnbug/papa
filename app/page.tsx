'use client';
import { useEffect, useRef, useState } from 'react';
import { Hand, Volume2, VolumeX, RotateCcw, ArrowUpRight, ArrowRight, Sparkles } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { PeachToy, type ToyHandle } from './peach-toy';
import { ImageCustomizer } from './image-customizer';
import { DEFAULT_IMAGE, SHORTS_IMAGE, type ToyImage } from '@/lib/image-settings';

export default function Home() {
  const toy = useRef<ToyHandle>(null);
  const [softness, setSoftness] = useState(68);
  const [sound, setSound] = useState(true);
  const [count, setCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [toyImage, setToyImage] = useState<ToyImage>(DEFAULT_IMAGE);
  const stage = toyImage.custom ? 2 : toyImage.src === DEFAULT_IMAGE.src ? 0 : 1;
  const last = useRef(0);
  const chain = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function recordHit() {
    const now = performance.now();
    chain.current = now - last.current < 950 ? chain.current + 1 : 1;
    last.current = now; setCount(n => n + 1); setCombo(chain.current);
    setBest(n => Math.max(n, chain.current));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setCombo(0); chain.current = 0; }, 950);
  }
  function reset() {
    if (timer.current) clearTimeout(timer.current);
    setCount(0); setCombo(0); setBest(0); chain.current = 0; last.current = 0;
    toy.current?.reset();
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => () => { if (toyImage.src.startsWith('blob:')) URL.revokeObjectURL(toyImage.src); }, [toyImage.src]);
  useEffect(() => () => { if (toyImage.original?.src.startsWith('blob:')) URL.revokeObjectURL(toyImage.original.src); }, [toyImage.original?.src]);
  function changeImage(image: ToyImage) { reset(); setToyImage(image); }
  return (
    <main className="playground">
      <header className="topbar">
        <a href="/" className="brand" aria-label="PAPA 拍拍蜜桃首页">papa<span>®</span></a>
        <div className="brand-caption">拍拍蜜桃<span>A LITTLE SOFT ESCAPE</span></div>
        <div className="top-note"><span className="live-dot" /> 随时可以，放松一下</div>
        <button className="icon-button top-sound" onClick={() => setSound(!sound)} aria-label={sound ? '关闭音效' : '开启音效'} aria-pressed={sound}>{sound ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
      </header>
      <section className="game" aria-label="拍拍蜜桃小游戏">
        <div className="intro"><div className="eyebrow"><span /> NO PRESSURE. JUST PEACH.</div><h1>今天，也辛苦啦<span>拍拍就好。</span></h1><p>把一点小情绪，交给软乎乎。</p></div>
        <div className="scoreboard"><span className="score-label">已经拍了</span><div className="score-number">{String(count).padStart(3, '0')}<span>下</span></div><div className="best">最高连击 <b>{best}</b></div></div>
        <div className="toy-area">
          <div className="soft-stamp" aria-hidden="true">100%<span>软 乎 乎</span><Sparkles size={16} /></div>
          <PeachToy key={toyImage.src} ref={toy} softness={softness} sound={sound} onHit={recordHit} image={toyImage} />
          <div className={`combo ${combo > 1 ? 'visible' : ''}`} aria-live="off"><span>COMBO</span><strong>×{combo}</strong><em>{combo >= 10 ? '停不下来了！' : combo >= 5 ? '烦恼弹走～' : '手感不错哦'}</em></div>
          <div className="touch-note" aria-hidden="true"><ArrowUpRight size={34} strokeWidth={1.1} /><span>别客气，拍这里</span></div>
        </div>
        <div className="play-hint"><Hand size={17} strokeWidth={1.6} /><span>点击拍一拍 <i>·</i> 按住揉一揉 <i>·</i> 连点更解压</span></div>
        <section className="experience-guide" aria-label="体验引导">
          <ol className="experience-steps">
            {['拍拍蜜桃', '试试臀部', '自己上传'].map((label, index) => <li key={label} className={index === stage ? 'active' : index < stage ? 'done' : ''} aria-current={index === stage ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}
          </ol>
          <div className="experience-copy" aria-live="polite">
            <h2>{stage === 0 ? count > 0 ? '手感不错？换个主角试试' : '先和这颗蜜桃打个招呼' : stage === 1 ? '换成你的图片，也能这样拍' : '现在，是你的专属软乎乎'}</h2>
            <p>{stage === 0 ? '拍拍、揉揉，玩够了再换个新手感。' : stage === 1 ? '选一张喜欢的图片，圈出想拍的地方。' : '继续拍一拍，或调整图片和拍打范围。'}</p>
          </div>
          {stage === 0 ? <button className="guide-next" onClick={() => changeImage(SHORTS_IMAGE)}>试试臀部图片<ArrowRight size={17} /></button> : <ImageCustomizer key={toyImage.src} current={toyImage} onApply={changeImage} />}
          {stage > 0 && <div className="experience-back"><button className="image-text-button" onClick={() => changeImage(DEFAULT_IMAGE)}>回到蜜桃</button>{stage === 2 && <button className="image-text-button" onClick={() => changeImage(SHORTS_IMAGE)}>换回臀部图片</button>}</div>}
        </section>
        <div className="controls">
          <div className="soft-control"><div className="control-title"><span>软糯度</span><span className="soft-value">{softness < 35 ? '弹弹的' : softness < 75 ? '刚刚好' : '糯叽叽'}</span></div><div className="slider-row"><span>Q 弹</span><Slider aria-label="软糯度" min={0} max={100} value={[softness]} onValueChange={v => setSoftness(Array.isArray(v) ? v[0] : v)} /><span>软糯</span></div></div>
          <span className="control-divider" />
          <button className={`control-button ${sound ? 'enabled' : ''}`} onClick={() => setSound(!sound)} aria-pressed={sound}>{sound ? <Volume2 size={21} /> : <VolumeX size={21} />}<span>音效{sound ? '开' : '关'}</span></button>
          <button className="control-button" onClick={reset} aria-label="重新开始，清空拍打次数"><RotateCcw size={20} /><span>重新来</span></button>
        </div>
      </section>
      <footer><span>MADE FOR YOUR SOFTER SIDE <span className="footer-star">✳</span></span></footer>
    </main>
  );
}
