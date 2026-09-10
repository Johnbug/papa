'use client';
import { useEffect, useRef, useState } from 'react';
import { Hand, Volume2, VolumeX, RotateCcw, ArrowUpRight, Sparkles } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { PeachToy, type ToyHandle } from './peach-toy';

export default function Home() {
  const toy = useRef<ToyHandle>(null);
  const [softness, setSoftness] = useState(68);
  const [sound, setSound] = useState(true);
  const [count, setCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
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
          <PeachToy ref={toy} softness={softness} sound={sound} onHit={recordHit} />
          <div className={`combo ${combo > 1 ? 'visible' : ''}`} aria-live="off"><span>COMBO</span><strong>×{combo}</strong><em>{combo >= 10 ? '停不下来了！' : combo >= 5 ? '烦恼弹走～' : '手感不错哦'}</em></div>
          <div className="touch-note" aria-hidden="true"><ArrowUpRight size={34} strokeWidth={1.1} /><span>别客气，拍这里</span></div>
        </div>
        <div className="play-hint"><Hand size={17} strokeWidth={1.6} /><span>点击拍一拍 <i>·</i> 按住揉一揉 <i>·</i> 连点更解压</span></div>
        <div className="controls">
          <div className="soft-control"><div className="control-title"><span>软糯度</span><span className="soft-value">{softness < 35 ? '弹弹的' : softness < 75 ? '刚刚好' : '糯叽叽'}</span></div><div className="slider-row"><span>Q 弹</span><Slider aria-label="软糯度" min={0} max={100} value={[softness]} onValueChange={v => setSoftness(Array.isArray(v) ? v[0] : v)} /><span>软糯</span></div></div>
          <span className="control-divider" />
          <button className={`control-button ${sound ? 'enabled' : ''}`} onClick={() => setSound(!sound)} aria-pressed={sound}>{sound ? <Volume2 size={21} /> : <VolumeX size={21} />}<span>音效{sound ? '开' : '关'}</span></button>
          <button className="control-button" onClick={reset} aria-label="重新开始，清空拍打次数"><RotateCcw size={20} /><span>重新来</span></button>
        </div>
      </section>
      <footer><span>无 KPI · 无输赢 · 只有好手感</span><span>MADE FOR YOUR SOFTER SIDE <span className="footer-star">✳</span></span></footer>
    </main>
  );
}
