import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Sparkles, ArrowRight } from 'lucide-react';
import { speechEngine } from '../utils/speech';
import { sound } from '../utils/audio';

export default function VoiceAssistant({ isOpen, onClose, selectedLang }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState(null);

  const sampleQuestions = [
    { text: 'सुबह छिड़काव का सही समय क्या है?', lang: 'hi' },
    { text: 'धान में ब्लास्ट रोग के लिए क्या करें?', lang: 'hi' },
    { text: 'How much bio-spray for 1 acre of tomato?', lang: 'en' },
  ];

  const handleAsk = (userText) => {
    sound.playClick();
    setTranscript(userText);

    const answer = {
      en: 'Mix 2 bottle caps of Trichoderma bio-spray into a 15-liter backpack sprayer. Spray between 6:30 AM and 10:30 AM before afternoon rain.',
      hi: '15 लीटर वाले स्प्रेयर में 2 ढक्कन ट्राइकोडर्मा घोलें। सुबह 6:30 से 10:30 बजे के बीच छिड़काव करें।',
      ta: '15 லிட்டர் தெளிப்பானில் 2 மூடி ட்ரைக்கோடெர்மா கலந்து காலை 10:30 மணிக்குள் தெளிக்கவும்.',
      te: '15 లీటర్ల స్प्रేయర్‌లో 2 మూతల ట్రైకోడెర్మా కలిపి ఉదయం 10:30 లోపు పిచికారీ చేయండి.',
      kn: '15 ಲೀಟರ್ ಸಿಂಪಡಕದಲ್ಲಿ 2 ಮುಚ್ಚಳ ಟ್ರೈಕೋಡರ್ಮಾ ಬೆರೆಸಿ ಬೆಳಿಗ್ಗೆ 10:30 ರೊಳಗೆ ಸಿಂಪಡಿಸಿ.',
    };

    const textToSpeak = answer[selectedLang] || answer['en'];
    setAiResponse(textToSpeak);

    const speechLangCode = selectedLang === 'hi' ? 'hi-IN' : selectedLang === 'ta' ? 'ta-IN' : selectedLang === 'te' ? 'te-IN' : selectedLang === 'kn' ? 'kn-IN' : 'en-IN';
    speechEngine.speak(textToSpeak, speechLangCode);
  };

  const handleMic = () => {
    sound.playClick();
    if (isListening) {
      speechEngine.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      const speechLangCode = selectedLang === 'hi' ? 'hi-IN' : selectedLang === 'ta' ? 'ta-IN' : selectedLang === 'te' ? 'te-IN' : selectedLang === 'kn' ? 'kn-IN' : 'en-IN';
      
      speechEngine.startListening(
        speechLangCode,
        (text) => setTranscript(text),
        () => {
          setIsListening(false);
          handleAsk(transcript || 'धान में ब्लास्ट रोग के लिए क्या करें?');
        },
        () => {
          setIsListening(false);
          handleAsk('धान में ब्लास्ट रोग के लिए क्या करें?');
        }
      );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full p-6 rounded-2xl bg-[#121514] border border-[#1f2421] text-white relative flex flex-col items-center text-center shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#181c1a] text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl mb-2">
              👨‍🌾
            </div>
            <h3 className="text-base font-bold text-white">Kisan Sahayak AI</h3>
            <p className="text-xs text-zinc-400 font-mono">Voice Agronomist (बोलकर पूछें)</p>

            {/* Mic button */}
            <div className="my-5 flex flex-col items-center">
              <button
                onClick={handleMic}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg'
                }`}
              >
                {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
              </button>
              <span className="text-[11px] font-mono text-zinc-400 mt-2">
                {isListening ? 'Listening...' : 'Tap to Speak'}
              </span>
            </div>

            {transcript && (
              <div className="w-full p-3 rounded-xl bg-[#181c1a] border border-[#232925] text-left text-xs space-y-2 mb-3">
                <div className="text-zinc-400 font-mono text-[10px]">You Asked:</div>
                <div className="text-white italic">"{transcript}"</div>
                {aiResponse && (
                  <div className="pt-2 border-t border-white/5 text-emerald-300 font-light">
                    {aiResponse}
                  </div>
                )}
              </div>
            )}

            {/* Sample Prompts */}
            <div className="w-full text-left space-y-1">
              {sampleQuestions.map((sq, i) => (
                <button
                  key={i}
                  onClick={() => handleAsk(sq.text)}
                  className="w-full p-2 rounded-lg bg-[#181c1a] hover:bg-[#202623] border border-transparent hover:border-emerald-500/20 text-xs text-zinc-300 text-left flex items-center justify-between"
                >
                  <span className="truncate">{sq.text}</span>
                  <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
