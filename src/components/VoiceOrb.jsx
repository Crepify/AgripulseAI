import { useEffect, useRef, useState } from 'react';
import { voiceGuide } from '../utils/voiceGuide';
import { sound } from '../utils/audio';

// ── Gemini-style live voice orb ─────────────────────────────────────────────
// A morphing aurora blob: breathes when idle, ripples while listening,
// dances while speaking. Tap to pause/resume, ✕ to stop. Shows live captions
// of what the guide says and what it hears. Self-contained: subscribes to
// the guide singleton and polls its live state.

const LABELS = {
  hi: { listening: 'सुन रहा हूँ…', speaking: 'बोल रहा हूँ…', asking: 'आपका जवाब सुनूँ?', idle: 'तैयार हूँ', paused: 'रुका हुआ — दबाकर चालू करें', off: 'बोलना शुरू करें' },
  en: { listening: 'Listening…', speaking: 'Speaking…', asking: 'Your answer?', idle: 'Ready', paused: 'Paused — tap to resume', off: 'Start voice' },
  ta: { listening: 'கேட்கிறேன்…', speaking: 'பேசுகிறேன்…', asking: 'பதில் சொல்லுங்கள்?', idle: 'தயார்', paused: 'நிறுத்தம் — தொட்டு தொடரவும்', off: 'குரலைத் தொடங்கு' },
  te: { listening: 'వింటున్నాను…', speaking: 'మాట్లాడుతున్నాను…', asking: 'మీ సమాధానం?', idle: 'సిద్ధం', paused: 'ఆగింది — నొక్కి కొనసాగించండి', off: 'వాయిస్ ప్రారంభించు' },
  kn: { listening: 'ಕೇಳುತ್ತಿದ್ದೇನೆ…', speaking: 'ಮಾತನಾಡುತ್ತಿದ್ದೇನೆ…', asking: 'ನಿಮ್ಮ ಉತ್ತರ?', idle: 'ಸಿದ್ಧ', paused: 'ನಿಂತಿದೆ — ಮುಂದುವರಿಸಲು ಒತ್ತಿ', off: 'ಧ್ವನಿ ಪ್ರಾರಂಭಿಸಿ' },
  mr: { listening: 'ऐकत आहे…', speaking: 'बोलत आहे…', asking: 'तुमचे उत्तर?', idle: 'तयार', paused: 'थांबले — सुरू करण्यासाठी दाबा', off: 'आवाज सुरू करा' },
};

const CSS = `
@keyframes vo-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.045); } }
@keyframes vo-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }
@keyframes vo-morph-a { 0% { transform: translate(-18%,-10%) scale(1); } 50% { transform: translate(16%,14%) scale(1.35); } 100% { transform: translate(-14%,12%) scale(0.9); } }
@keyframes vo-morph-b { 0% { transform: translate(16%,12%) scale(1.1); } 50% { transform: translate(-16%,-8%) scale(0.85); } 100% { transform: translate(10%,-14%) scale(1.3); } }
@keyframes vo-morph-c { 0% { transform: translate(8%,16%) scale(0.95) rotate(0deg); } 50% { transform: translate(-10%,-16%) scale(1.25) rotate(180deg); } 100% { transform: translate(14%,-6%) scale(1) rotate(360deg); } }
@keyframes vo-ring { 0% { transform: scale(0.85); opacity: 0.7; } 100% { transform: scale(2.05); opacity: 0; } }
@keyframes vo-fadeup { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes vo-spin-slow { to { transform: rotate(360deg); } }
.vo-wrap { position: fixed; right: 14px; z-index: 60; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; font-family: inherit; -webkit-tap-highlight-color: transparent; }
.vo-stack { position: relative; display: flex; align-items: center; justify-content: center; }
.vo-orb { position: relative; width: 74px; height: 74px; border-radius: 9999px; overflow: hidden; cursor: pointer; border: 1px solid rgba(255,255,255,0.14); background: radial-gradient(circle at 32% 28%, #063b2e 0%, #041a14 62%, #020c09 100%); box-shadow: 0 0 34px rgba(16,185,129,0.32), 0 8px 26px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.10); transition: box-shadow 0.4s ease, filter 0.4s ease; }
.vo-orb:hover { box-shadow: 0 0 44px rgba(16,185,129,0.5), 0 8px 26px rgba(0,0,0,0.45); }
.vo-blob { position: absolute; width: 64px; height: 64px; border-radius: 9999px; filter: blur(13px); will-change: transform; }
.vo-b1 { left: 2px; top: 4px; background: radial-gradient(circle at 35% 35%, #34d399, #059669 70%); animation: vo-morph-a 5.2s ease-in-out infinite; }
.vo-b2 { right: 0; bottom: 2px; background: radial-gradient(circle at 60% 60%, #38bdf8, #0e7490 75%); animation: vo-morph-b 6.7s ease-in-out infinite; }
.vo-b3 { left: 12px; bottom: 6px; width: 52px; height: 52px; background: radial-gradient(circle at 50% 45%, #a78bfa, #6d28d9 78%); opacity: 0.75; animation: vo-morph-c 8.3s linear infinite; }
.vo-gloss { position: absolute; inset: 0; background: radial-gradient(circle at 30% 22%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 26%, transparent 55%); pointer-events: none; }
.vo-ring { position: absolute; inset: -6px; border-radius: 9999px; border: 2px solid rgba(52,211,153,0.55); animation: vo-ring 1.9s ease-out infinite; pointer-events: none; }
.vo-ring.r2 { animation-delay: 0.95s; }
.vo-orb.st-idle { animation: vo-breathe 3.6s ease-in-out infinite; }
.vo-orb.st-speaking { animation: vo-pulse 1.15s ease-in-out infinite; box-shadow: 0 0 52px rgba(52,211,153,0.6), 0 8px 26px rgba(0,0,0,0.45); }
.vo-orb.st-speaking .vo-b1 { animation: vo-morph-a 1.05s ease-in-out infinite; }
.vo-orb.st-speaking .vo-b2 { animation: vo-morph-b 1.35s ease-in-out infinite; }
.vo-orb.st-speaking .vo-b3 { animation: vo-morph-c 1.7s linear infinite; }
.vo-orb.st-listening .vo-b1 { animation: vo-morph-a 2.4s ease-in-out infinite; }
.vo-orb.st-listening .vo-b2 { animation: vo-morph-b 3.1s ease-in-out infinite; }
.vo-orb.st-listening .vo-b3 { animation: vo-morph-c 3.8s linear infinite; }
.vo-orb.st-asking .vo-b1 { animation: vo-morph-a 1.7s ease-in-out infinite; }
.vo-orb.st-asking .vo-b2 { animation: vo-morph-b 2.2s ease-in-out infinite; }
.vo-orb.st-paused { filter: grayscale(0.65) brightness(0.8); }
.vo-orb.st-paused .vo-b1, .vo-orb.st-paused .vo-b2, .vo-orb.st-paused .vo-b3 { animation-play-state: paused; }
.vo-x { position: absolute; top: -6px; right: -6px; width: 24px; height: 24px; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.2); background: rgba(9,10,9,0.92); color: #fca5a5; font-size: 11px; line-height: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 2; }
.vo-x:hover { background: #7f1d1d; color: #fff; }
.vo-off { width: 62px; height: 62px; border-radius: 9999px; border: none; cursor: pointer; background: radial-gradient(circle at 32% 28%, #34d399, #059669 70%); color: #fff; font-size: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 28px rgba(16,185,129,0.45), 0 8px 22px rgba(0,0,0,0.4); animation: vo-breathe 3.6s ease-in-out infinite; }
.vo-label { max-width: 210px; text-align: right; font-size: 11px; font-weight: 800; color: #d1fae5; background: rgba(3,20,15,0.82); border: 1px solid rgba(16,185,129,0.25); padding: 4px 10px; border-radius: 9999px; backdrop-filter: blur(6px); animation: vo-fadeup 0.35s ease; }
.vo-cap { max-width: 210px; text-align: right; font-size: 10.5px; line-height: 1.45; color: #a7f3d0; background: rgba(3,20,15,0.7); border: 1px solid rgba(16,185,129,0.18); padding: 5px 10px; border-radius: 12px; backdrop-filter: blur(6px); animation: vo-fadeup 0.35s ease; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
.vo-cap b { color: #fff; }
`;

export default function VoiceOrb({ offsetBottom = 96, onRestart }) {
  const [snap, setSnap] = useState({ state: 'off', heard: '', line: '' });
  const raf = useRef(0);

  useEffect(() => {
    const unsubscribe = voiceGuide.subscribe(() => {});
    const tick = () => {
      setSnap((prev) => {
        const next = {
          state: voiceGuide.getState(),
          heard: voiceGuide.lastHeard || '',
          line: voiceGuide.lastLine || '',
        };
        if (prev.state === next.state && prev.heard === next.heard && prev.line === next.line) return prev;
        return next;
      });
      raf.current = window.setTimeout(tick, 180);
    };
    tick();
    return () => { clearTimeout(raf.current); unsubscribe(); };
  }, []);

  const labels = LABELS[voiceGuide.lang] || LABELS.hi;
  const st = snap.state;

  const toggle = () => {
    sound.playClick();
    if (st === 'off') { if (onRestart) onRestart(); return; }
    if (st === 'paused') voiceGuide.resume();
    else voiceGuide.suspend();
  };

  const stop = (e) => {
    e.stopPropagation();
    sound.playClick();
    voiceGuide.stopTour();
  };

  return (
    <div className="vo-wrap" style={{ bottom: offsetBottom }}>
      <style>{CSS}</style>
      {st === 'off' ? (
        <button type="button" className="vo-off" onClick={toggle} aria-label={labels.off} title={labels.off}>
          🎙️
        </button>
      ) : (
        <div className="vo-stack">
          <div
            className={`vo-orb st-${st}`}
            onClick={toggle}
            role="button"
            tabIndex={0}
            aria-label={`Voice guide: ${labels[st] || st}`}
            title={labels.paused && st === 'paused' ? labels.paused : labels[st]}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
          >
            <span className="vo-blob vo-b1" />
            <span className="vo-blob vo-b2" />
            <span className="vo-blob vo-b3" />
            <span className="vo-gloss" />
            {(st === 'listening' || st === 'asking') && (<><span className="vo-ring" /><span className="vo-ring r2" /></>)}
          </div>
          <button type="button" className="vo-x" onClick={stop} aria-label="Stop voice guide" title="Stop">✕</button>
        </div>
      )}
      <div className="vo-label" aria-live="polite">{labels[st] || labels.idle}</div>
      {/* What the farmer last said stays visible while the guide replies —
          like Gemini Live, you always see your own words + its answer. */}
      {st !== 'off' && st !== 'paused' && snap.heard && (
        <div className="vo-cap"><b>🎙️</b> {String(snap.heard).slice(0, 140)}</div>
      )}
      {st === 'speaking' && snap.line && (
        <div className="vo-cap"><b>🔊</b> {String(snap.line).slice(0, 140)}</div>
      )}
    </div>
  );
}
