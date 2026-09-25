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
      this.recognition.lang = langCode;
      this.recognition.onstart = () => {
        this.isListening = true;
      };

      this.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (onResult) onResult(transcript);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (onEnd) onEnd();
      };

      this.recognition.onerror = (e) => {
        this.isListening = false;
        if (onError) onError(e.error);
      };

      this.recognition.start();
    } catch (err) {
      this.isListening = false;
      if (onError) onError(err);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}

export const speechEngine = new SpeechEngine();
