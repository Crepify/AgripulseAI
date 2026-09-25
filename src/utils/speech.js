// Enhanced Speech Engine with Native Voice Auto-Detection & Phonetic Fallback
// Guarantees fluent, accurate spoken sentences across all operating systems without skipping words

class SpeechEngine {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.recognition = null;
    this.isListening = false;
    this.voices = [];
    this._finalText = '';   // accumulated final transcript of the utterance
    this._finalIdx = 0;     // results[0.._finalIdx) already appended
    // Languages the cloud TTS endpoint can speak — every device gets these
    // regardless of installed voices (farmers can't install voice packs).
    this.cloudLangs = ['hi', 'en', 'ta', 'te', 'kn', 'mr'];
    this._cloudAudio = null;
    this._cloudPlaying = false;

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
      (baseLang === 'kn' && (v.name.includes('ಕನ್ನಡ') || v.name.toLowerCase().includes('kannada'))) ||
      (baseLang === 'mr' && (v.name.includes('मराठी') || v.name.toLowerCase().includes('marathi')))
    );
    if (matched) return { voice: matched, isNative: true };

    // 4. Indian English voice fallback (e.g. 'en-IN', 'Rishi', 'Veena', 'Indian')
    matched = this.voices.find(v => v.lang.toLowerCase().includes('en-in') || v.name.toLowerCase().includes('india'));
    if (matched) return { voice: matched, isNative: false };

    // 5. Default browser voice
    return { voice: this.voices[0], isNative: false };
  }

  // Unified speak: local native voice when present, else cloud TTS, else
  // the local fallback (romanized/English) text. Farmers never need to
  // install anything to hear Tamil/Telugu/Kannada/Marathi.
  async speakSmart(text, langCode, onEnd, { fallbackText } = {}) {
    const vi = this.getBestVoice(langCode);
    if (vi && vi.isNative) {
      this.speak(text, langCode, onEnd);
      return;
    }
    try {
      await this.cloudSpeak(text, langCode);
      if (onEnd) onEnd(true);
    } catch {
      // cloud unavailable (offline / autoplay-blocked) → best local effort
      this.speak(fallbackText || text, 'en-IN', () => onEnd && onEnd(false));
    }
  }

  async cloudSpeak(text, langCode) {
    const base = String(langCode || 'hi').split('-')[0];
    const r = await fetch(`/api/tts?text=${encodeURIComponent(text)}&lang=${base}`, {
      headers: { Accept: 'audio/mpeg' },
    });
    if (!r.ok) throw new Error(`tts ${r.status}`);
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    this._cloudAudio = audio;
    this._cloudPlaying = true;
    const done = () => {
      this._cloudPlaying = false;
      this._cloudAudio = null;
      try { URL.revokeObjectURL(url); } catch { /* noop */ }
    };
    // Resolve only when the audio has FINISHED — the guide must not open the
    // mic while its own voice is still playing (self-hearing).
    return await new Promise((resolve, reject) => {
      audio.onended = () => { done(); resolve(); };
      audio.onerror = () => { done(); resolve(); }; // cut short ≠ fatal
      audio.play().catch((err) => { done(); reject(err); }); // autoplay-blocked
    });
  }

  isPlaying() {
    return !!(this._cloudPlaying || (this.synth && this.synth.speaking));
  }

  speak(textData, langCode = 'hi-IN', onEnd) {
    if (!this.synth) return;
    this.synth.cancel();

    // textData can be either a plain string or an object { devanagari: '...', phonetic: '...' }
    let textToSpeak = typeof textData === 'string' ? textData : (textData.devanagari || textData.phonetic || textData.en);
    const phoneticText = typeof textData === 'object' ? textData.phonetic : null;

    const voiceInfo = this.getBestVoice(langCode);

    // If native Devanagari/regional voice is NOT available on this device,
    // use phonetic Romanized Hindi text so the synthesizer speaks fluent Hindi words instead of just numbers!
    if (voiceInfo && !voiceInfo.isNative && phoneticText) {
      textToSpeak = phoneticText;
    }

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

  stopSpeaking() {
    if (this._cloudAudio) {
      try { this._cloudAudio.pause(); } catch { /* noop */ }
      this._cloudAudio = null;
    }
    this._cloudPlaying = false;
    if (this.synth) {
      this.synth.cancel();
    }
  }

  startListening(langCode = 'hi-IN', onResult, onEnd, onError) {
    if (!this.recognition) {
      if (onError) onError('Speech recognition not supported on this browser.');
      return;
    }

    try {
      this._finalText = '';
      this._finalIdx = 0;
      this.recognition.lang = langCode;
      this.recognition.maxAlternatives = 2;
      this.recognition.onstart = () => {
        this.isListening = true;
        this._finalText = '';
        this._finalIdx = 0;
      };

      this.recognition.onresult = (event) => {
        // Accumulate the WHOLE utterance across events: Chrome finalizes a
        // long sentence segment by segment, and acting on only the last
        // segment truncated everything the farmer said before it.
        let interim = '';
        for (let i = this._finalIdx; i < event.results.length; ++i) {
          const r = event.results[i];
          if (r.isFinal) { this._finalText += r[0].transcript; this._finalIdx = i + 1; }
          else interim += r[0].transcript;
        }
        const final = (this._finalText || '').trim();
        // FINAL results are the ones to act on — interim fragments from
        // noise/echo used to phantom-trigger the guide. Interim still flows
        // for live UI display.
        if (onResult) onResult(final || interim, { final: !!final });
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this._finalText = '';
        this._finalIdx = 0;
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
          throw err;
        }
      };
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
