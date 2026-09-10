'use client';
import { useEffect, useRef, useState } from 'react';
import { Hand, Volume2, VolumeX, RotateCcw, ArrowUpRight, ArrowRight, Sparkles, Languages } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { PeachToy, type ToyHandle } from './peach-toy';
import { ImageCustomizer } from './image-customizer';
import { DEFAULT_IMAGE, MODEL_IMAGE, defaultSoftness, type ToyImage } from '@/lib/image-settings';
import { imageKind, trackEvent } from '@/lib/analytics';
import { LocaleProvider, useI18n } from './i18n';
import { normalizeLocale } from '@/lib/locale';
import { PrivacyNotice } from './privacy-notice';

export default function Home() {
  return <LocaleProvider><Game /></LocaleProvider>;
}

function Game() {
  const { locale, t, setLocale } = useI18n();
  const toy = useRef<ToyHandle>(null);
  const [softness, setSoftness] = useState(defaultSoftness(DEFAULT_IMAGE));
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
  function changeImage(image: ToyImage) {
    trackEvent('image_change', { from: imageKind(toyImage), to: imageKind(image) });
    if (imageKind(image) !== imageKind(toyImage)) setSoftness(defaultSoftness(image));
    reset(); setToyImage(image);
  }
  function toggleSound(location: 'header' | 'controls') {
    trackEvent('sound_toggle', { enabled: !sound, location });
    setSound(!sound);
  }
  return (
    <main className="playground">
      <header className="topbar">
        <a href="/" onClick={() => trackEvent('home_click', { image: imageKind(toyImage) })} className="brand" aria-label={t.home}>papa</a>
        <div className="brand-caption">{t.brand}<span>{t.brandTagline}</span></div>
        <div className="top-note"><span className="live-dot" /> {t.topNote}</div>
        <div className="top-actions">
          <label className="language-picker"><Languages size={16} aria-hidden="true" /><select aria-label={t.language} value={locale} onChange={e => { const next = normalizeLocale(e.target.value); if (next) setLocale(next); }}><option value="zh" lang="zh-CN">中文</option><option value="en" lang="en">English</option><option value="ja" lang="ja">日本語</option></select></label>
          <button className="icon-button top-sound" onClick={() => toggleSound('header')} aria-label={sound ? t.mute : t.unmute} aria-pressed={sound}>{sound ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
        </div>
      </header>
      <section className="game" aria-label={t.game}>
        <div className="intro"><div className="eyebrow"><span /> {t.eyebrow}</div><h1>{t.headline}<span>{t.headlineAccent}</span></h1><p>{t.intro}</p></div>
        <div className="scoreboard"><span className="score-label">{t.score}</span><div className="score-number">{String(count).padStart(3, '0')}{t.scoreUnit && <span>{t.scoreUnit}</span>}</div><div className="best">{t.best} <b>{best}</b></div></div>
        <div className="toy-area">
          <div className="soft-stamp" aria-hidden="true">100%<span>{t.stamp}</span><Sparkles size={16} /></div>
          <PeachToy key={toyImage.src} ref={toy} softness={softness} sound={sound} onHit={recordHit} image={toyImage} />
          <div className={`combo ${combo > 1 ? 'visible' : ''}`} aria-live="off"><span>{t.combo}</span><strong>×{combo}</strong><em>{combo >= 10 ? t.comboGreat : combo >= 5 ? t.comboGood : t.comboStart}</em></div>
          <div className="touch-note" aria-hidden="true"><ArrowUpRight size={34} strokeWidth={1.1} /><span>{t.touch}</span></div>
        </div>
        <div className="play-hint"><Hand size={17} strokeWidth={1.6} /><span>{t.hintTap} <i>·</i> {t.hintHold} <i>·</i> {t.hintCombo}</span></div>
        <section className="experience-guide" aria-label={t.guide}>
          <ol className="experience-steps">
            {[t.stepPeach, t.stepModel, t.stepUpload].map((label, index) => <li key={label} className={index === stage ? 'active' : index < stage ? 'done' : ''} aria-current={index === stage ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}
          </ol>
          {stage === 0 ? <button className="guide-next" onClick={() => changeImage(MODEL_IMAGE)}>{t.tryModel}<ArrowRight size={15} /></button> : <ImageCustomizer key={toyImage.src} current={toyImage} onApply={changeImage} secondaryActions={<div className="experience-back"><button className="image-text-button" onClick={() => changeImage(DEFAULT_IMAGE)}>{t.backPeach}</button>{stage === 2 && <button className="image-text-button" onClick={() => changeImage(MODEL_IMAGE)}>{t.backModel}</button>}</div>} />}
        </section>
        <div className="controls">
          <div className="soft-control"><div className="control-title"><span>{t.softness}</span><span className="soft-value">{softness < 35 ? t.firmValue : softness < 75 ? t.mediumValue : t.softValue}</span></div><div className="slider-row"><span>{t.firm}</span><Slider aria-label={t.softness} aria-describedby="softness-hint" min={0} max={100} value={[softness]} onValueChange={v => setSoftness(Array.isArray(v) ? v[0] : v)} onValueCommitted={v => trackEvent('softness_change', { value: Array.isArray(v) ? v[0] : v })} /><span>{t.soft}</span></div></div>
          <span className="control-divider" />
          <button className={`control-button ${sound ? 'enabled' : ''}`} onClick={() => toggleSound('controls')} aria-pressed={sound}>{sound ? <Volume2 size={21} /> : <VolumeX size={21} />}<span>{sound ? t.soundOn : t.soundOff}</span></button>
          <button className="control-button" onClick={() => { trackEvent('game_reset', { image: imageKind(toyImage) }); reset(); }} aria-label={t.resetLabel}><RotateCcw size={20} /><span>{t.reset}</span></button>
          <p id="softness-hint" className="softness-hint" aria-live="polite">{stage === 1 ? t.denimSoftnessHint : t.softnessHint}</p>
        </div>
      </section>
      <footer><PrivacyNotice /><span>{t.footer} <span className="footer-star">✳</span></span></footer>
    </main>
  );
}
