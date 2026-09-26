// Enhanced Speech Engine with Native Voice Auto-Detection & Phonetic Fallback
// Guarantees fluent, accurate spoken sentences across all operating systems without skipping words

class SpeechEngine {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.recognition = null;
    this.isListening = false;
    this.voices = [];

    if (this.synth) {
      this.loadVoices();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }

    this.initRecognition();
  }

  loadVoices() {
    if (this.synth) {
      this.voices = this.synth.getVoices() || [];
    }
  }

  initRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
      }
    }
  }

  // Cloud/neural voices (Google, Microsoft Natural, etc.) sound dramatically
  // better than the first local voice in the list — prefer them when present.
  static PREMIUM = /google|natural|neural|premium|enhanced|online/i;

  getBestVoice(langCode) {
    this.loadVoices();
    if (!this.voices || this.voices.length === 0) return null;

    const baseLang = langCode.split('-')[0].toLowerCase();
    const pickBest = (list) => {
      if (!list || list.length === 0) return null;
      const premium = list.find(v => SpeechEngine.PREMIUM.test(v.name));
      return premium || list[0];
    };

    // 1. Exact match (e.g. 'hi-IN', 'ta-IN')
    let matched = pickBest(this.voices.filter(v => v.lang.toLowerCase() === langCode.toLowerCase()));
    if (matched) return { voice: matched, isNative: true };

    // 2. Starts with base language (e.g. 'hi', 'ta', 'te', 'kn')
    matched = pickBest(this.voices.filter(v => v.lang.toLowerCase().startsWith(baseLang)));
    if (matched) return { voice: matched, isNative: true };

    // 3. Name contains language name (e.g. 'Google हिन्दी', 'Hindi', 'Lekha')
    matched = this.voices.find(v => 
      v.name.toLowerCase().includes(baseLang) ||
      (baseLang === 'hi' && (v.name.includes('हिन्दी') || v.name.toLowerCase().includes('hindi'))) ||
      (baseLang === 'ta' && (v.name.includes('தமிழ்') || v.name.toLowerCase().includes('tamil'))) ||
      (baseLang === 'te' && (v.name.includes('తెలుగు') || v.name.toLowerCase().includes('telugu'))) ||
      (baseLang === 'kn' && (v.name.includes('ಕನ್ನಡ') || v.name.toLowerCase().includes('kannada')))
    );
    if (matched) return { voice: matched, isNative: true };

    // 4. Indian English voice fallback (e.g. 'en-IN', 'Rishi', 'Veena', 'Indian')
    matched = this.voices.find(v => v.lang.toLowerCase().includes('en-in') || v.name.toLowerCase().includes('india'));
    if (matched) return { voice: matched, isNative: false };

    // 5. Default browser voice
    return { voice: this.voices[0], isNative: false };
  }

  // L2 — cloud TTS: natural Indian-language speech for devices with no local
  // voice for the language. Free proxy endpoint (no key, nothing to install —
  // the farmer must never have to install anything), cached in-memory by
  // text+lang so repeated lines don't refetch. Falls back to the local voice
  // on ANY failure (offline, slow, blocked) so the guide is never silent.
  _cloudSpeak(text, lang, onEnd, fallback) {
    let finished = false;
    const done = () => { if (!finished && onEnd) { finished = true; onEnd(); } };
    const fail = () => { if (!finished) { finished = true; fallback(); } };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { fail(); return; }
    const key = lang + ':' + text;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => { try { ctrl && ctrl.abort(); } catch {} }, 6000);
    const play = (url) => {
      try {
        const audio = new Audio(url);
        this._ttsAudio = audio;
        audio.onended = done;
        audio.onerror = fail;
        const p = audio.play();
        if (p && p.catch) p.catch(fail);
        // Safety: if neither end nor error fires (weird browsers), don't hang the guide
        setTimeout(() => { try { if (!finished && audio.paused && audio.currentTime === 0) fail(); } catch {} }, 15000);
      } catch { fail(); }
    };
    const cached = this._ttsCache && this._ttsCache.get(key);
    if (cached) { clearTimeout(timer); play(cached); return; }
    fetch(`/api/tts?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}`, ctrl ? { signal: ctrl.signal } : undefined)
      .then((r) => { if (!r.ok) throw new Error('tts ' + r.status); return r.blob(); })
      .then((blob) => {
        clearTimeout(timer);
        const url = URL.createObjectURL(blob);
        if (!this._ttsCache) this._ttsCache = new Map();
        if (this._ttsCache.size > 60) this._ttsCache.clear(); // keep memory bounded
        this._ttsCache.set(key, url);
        play(url);
      })
      .catch(() => { clearTimeout(timer); fail(); });
  }

  // L1/L3 — the local device synthesizer. With no native voice for the
  // language, phonetic Romanized text sounds far better than raw Devanagari
  // read by an English voice.
  _localSpeak(nativeText, phoneticText, voiceInfo, langCode, onEnd) {
    if (!this.synth) { if (onEnd) onEnd(); return; }
    let textToSpeak = nativeText;
    if (voiceInfo && !voiceInfo.isNative && phoneticText) textToSpeak = phoneticText;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (voiceInfo && voiceInfo.voice) {
      utterance.voice = voiceInfo.voice;
      utterance.lang = voiceInfo.voice.lang;
    } else {
      utterance.lang = langCode;
    }
    utterance.rate = 0.92; // Slightly measured rate for clear rural comprehension
    utterance.pitch = 1.0;
    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }
    this.synth.speak(utterance);
  }

  speak(textData, langCode = 'hi-IN', onEnd) {
    if (!this.synth) { if (onEnd) onEnd(); return; }
    this.synth.cancel();
    if (this._ttsAudio) { try { this._ttsAudio.pause(); } catch {} this._ttsAudio = null; }

    // textData can be either a plain string or an object { devanagari: '...', phonetic: '...' }
    const isStr = typeof textData === 'string';
    const nativeText = isStr ? textData : (textData.devanagari || textData.phonetic || textData.en || '');
    const phoneticText = !isStr && textData.phonetic ? textData.phonetic : null;

    const voiceInfo = this.getBestVoice(langCode);
    const baseLang = String(langCode || '').split('-')[0].toLowerCase();

    // L1 — a real native voice for the language: best quality, works offline.
    if (voiceInfo && voiceInfo.isNative) {
      this._localSpeak(nativeText, phoneticText, voiceInfo, langCode, onEnd);
      return;
    }
    // L2 — no native voice on this device (very common for ta/te/kn/mr):
    // natural cloud speech instead of a wrong-accent robot. English always
    // has a local voice, so it never needs the network.
    if (baseLang && baseLang !== 'en' && nativeText) {
      this._cloudSpeak(nativeText, baseLang, onEnd, () =>
        this._localSpeak(nativeText, phoneticText, voiceInfo, langCode, onEnd));
      return;
    }
    // L3 — local voice with phonetic text.
    this._localSpeak(nativeText, phoneticText, voiceInfo, langCode, onEnd);
  }

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
    }
    // Cloud voice too — barge-in must silence BOTH layers or the guide
    // keeps talking over the farmer.
    if (this._ttsAudio) {
      try { this._ttsAudio.pause(); } catch {}
      this._ttsAudio = null;
    }
  }

  startListening(langCode = 'hi-IN', onResult, onEnd, onError) {
    if (!this.recognition) {
      if (onError) onError('Speech recognition not supported on this browser.');
      return;
    }

    try {
      this.recognition.lang = langCode;
      this.recognition.onstart = () => {
        this.isListening = true;
      };

      this.recognition.onresult = (event) => {
        let final = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const r = event.results[i];
          if (r.isFinal) final += r[0].transcript;
          else interim += r[0].transcript;
        }
        // FINAL results are the ones to act on — interim fragments from
        // noise/echo used to phantom-trigger the guide (stray 'no' that
        // killed the tour). Interim text still flows for live UI display.
        if (onResult) onResult(final || interim, { final: !!final });
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (onEnd) onEnd();
      };

      this.recognition.onerror = (e) => {
        this.isListening = false;
        if (onError) onError(e.error);
      };

      // Chrome throws InvalidStateError if start() races a previous stop —
      // abort and retry a couple of times instead of failing the whole
      // listening session (rapid speak/listen cycles made this frequent).
      const attemptStart = (retriesLeft) => {
        try {
          this.recognition.start();
        } catch (err) {
          if (retriesLeft > 0) {
            try { this.recognition.abort(); } catch { /* wasn't running */ }
            setTimeout(() => attemptStart(retriesLeft - 1), 350);
            return;
          }
          // Giving up must NEVER throw: this runs inside a setTimeout, so a
          // rethrow here is an UNCAUGHT window error — the app's stale-asset
          // recovery would reload the page and wipe whatever the farmer was
          // typing. Report it like any other mic failure instead.
          this.isListening = false;
          if (onError) onError(err);
        }
      };
      // Another component (Voice Fill, the guide's own revive timer) may
      // still hold the shared recognizer open — a start() on top of it is
      // the classic InvalidStateError. Clear the decks first.
      try { this.recognition.abort(); } catch { /* wasn't running */ }
      attemptStart(2);
    } catch (err) {
      this.isListening = false;
      if (onError) onError(err);
    }
  }

  stopListening() {
    // Always issue the stop: between start() and onstart firing, isListening
    // is still false — skipping stop() there left the mic RUNNING (it then
    // heard our own speech and phantom-triggered the guide).
    if (this.recognition) {
      try { this.recognition.stop(); } catch { /* wasn't started */ }
      this.isListening = false;
    }
  }
}

export const speechEngine = new SpeechEngine();
