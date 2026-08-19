import React, { useState, useRef } from 'react';
import { Camera, Upload, Volume2, VideoOff, Leaf } from 'lucide-react';
import { CROPS } from '../data/agriData';
import { analyzeLeafOnDevice } from '../utils/onDeviceModel';
import { speechEngine } from '../utils/speech';
import { sound } from '../utils/audio';

export default function TabScanner({ selectedLang }) {
  const [selectedCrop, setSelectedCrop] = useState(CROPS[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [customImage, setCustomImage] = useState(null);
  const [dosageType, setDosageType] = useState('bio');
  const [sprayerSize, setSprayerSize] = useState('15L');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const startCamera = async () => {
    sound.playClick();
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setIsCameraActive(false);
      alert('Camera access not granted. You can upload an image or select a sample scan below.');
    }
  };

  const stopCamera = () => {
    sound.playClick();
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    sound.playClick();
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');
    setCustomImage(dataUrl);
    stopCamera();
    await runScan(dataUrl);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      setCustomImage(dataUrl);
      stopCamera();
      await runScan(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const runScan = async (imgSrc) => {
    setIsAnalyzing(true);
    sound.playTransition();

    const img = new Image();
    img.src = imgSrc;
    img.onload = async () => {
      const res = await analyzeLeafOnDevice(img, canvasRef.current);
      setSelectedCrop(res.matchedCrop);
      setIsAnalyzing(false);
      sound.playSuccess();
    };
  };

  const handleSelectCrop = async (crop) => {
    sound.playClick();
    setCustomImage(null);
    stopCamera();
    setIsAnalyzing(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = crop.image;
    img.onload = async () => {
      const res = await analyzeLeafOnDevice(img, canvasRef.current);
      setSelectedCrop(crop);
      setIsAnalyzing(false);
      sound.playSuccess();
    };
  };

  const playVoicePrescription = () => {
    sound.playClick();
    if (isPlayingAudio) {
      speechEngine.stopSpeaking();
      setIsPlayingAudio(false);
    } else {
      const textToSpeak = selectedCrop.audio[selectedLang] || selectedCrop.audio['en'];
      const speechLangCode = selectedLang === 'hi' ? 'hi-IN' : selectedLang === 'ta' ? 'ta-IN' : selectedLang === 'te' ? 'te-IN' : selectedLang === 'kn' ? 'kn-IN' : 'en-IN';
      setIsPlayingAudio(true);
      speechEngine.speak(textToSpeak, speechLangCode, () => {
        setIsPlayingAudio(false);
      });
    }
  };

  const getDoseText = () => {
    if (sprayerSize === '20L') return '2.5 Bottle Caps (40ml)';
    if (sprayerSize === '100L') return '10 Bottle Caps (150ml) in 100L Drum';
    return selectedCrop.dosage[dosageType].measure;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 space-y-6">
      {/* Sample Crop Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-zinc-400 whitespace-nowrap">Sample Crops:</span>
        {CROPS.map((c) => (
          <button
            key={c.id}
            onClick={() => handleSelectCrop(c)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              selectedCrop.id === c.id && !customImage && !isCameraActive
                ? 'bg-emerald-500 text-black font-bold'
                : 'bg-[#151817] text-zinc-400 hover:text-zinc-200 border border-[#232925]'
            }`}
          >
            {c.name} ({c.localName})
          </button>
        ))}
      </div>

      {/* 2-Column Clean Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Viewfinder */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-black border border-[#1f2421] min-h-[320px] flex items-center justify-center">
            {isCameraActive ? (
              <div className="relative w-full h-[320px]">
                <video ref={videoRef} playsInline autoPlay className="w-full h-full object-cover" />
                <button
                  onClick={capturePhoto}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-emerald-500 text-black font-bold text-xs shadow-lg"
                >
                  Snap Photo
                </button>
              </div>
            ) : (
              <div className="relative w-full h-[320px] flex items-center justify-center overflow-hidden">
                <img
                  src={customImage || selectedCrop.image}
                  alt={selectedCrop.name}
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />
              </div>
            )}
          </div>

          {/* Action Buttons: Camera & Upload */}
          <div className="grid grid-cols-2 gap-2">
            {!isCameraActive ? (
              <button
                onClick={startCamera}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-transform active:scale-95 shadow-sm"
              >
                <Camera className="w-4 h-4" />
                <span>Open Camera</span>
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs"
              >
                <VideoOff className="w-4 h-4" />
                <span>Close Camera</span>
              </button>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current.click()}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#151817] hover:bg-[#1e2320] text-zinc-300 border border-[#232925] font-bold text-xs"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Photo</span>
            </button>
          </div>
        </div>

        {/* Right: Diagnosis & Dosage */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-[#121514] border border-[#1f2421] space-y-5">
            {/* Title & Listen Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1f2421]">
              <div>
                <span className="text-xs text-emerald-400 font-bold">
                  Diagnosis Result ({selectedCrop.confidence}% Match)
                </span>
                <h2 className="text-xl md:text-2xl font-bold text-white mt-0.5">
                  {selectedCrop.disease}
                </h2>
              </div>

              <button
                onClick={playVoicePrescription}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isPlayingAudio
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-sm'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>{isPlayingAudio ? 'Stop Voice' : 'Listen Advice'}</span>
              </button>
            </div>

            {/* Symptoms */}
            <p className="text-xs text-zinc-300 font-light leading-relaxed">
              <strong>Symptoms:</strong> {selectedCrop.symptoms}
            </p>

            {/* Dosage Recipe Box */}
            <div className="p-4 rounded-xl bg-[#181c1a] border border-emerald-500/20 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Leaf className="w-4 h-4 text-emerald-400" />
                  Practical Dosage Measure
                </span>

                {/* Bio vs Chemical */}
                <div className="flex items-center bg-[#0e100f] p-1 rounded-lg border border-[#232925] text-xs">
                  <button
                    onClick={() => { sound.playClick(); setDosageType('bio'); }}
                    className={`px-2.5 py-0.5 rounded font-medium transition-all ${
                      dosageType === 'bio' ? 'bg-emerald-500 text-black font-bold' : 'text-zinc-400'
                    }`}
                  >
                    Organic Bio
                  </button>
                  <button
                    onClick={() => { sound.playClick(); setDosageType('chemical'); }}
                    className={`px-2.5 py-0.5 rounded font-medium transition-all ${
                      dosageType === 'chemical' ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400'
                    }`}
                  >
                    Chemical
                  </button>
                </div>
              </div>

              {/* Equipment Selector */}
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span>Sprayer:</span>
                {['15L', '20L', '100L'].map((s) => (
                  <button
                    key={s}
                    onClick={() => { sound.playClick(); setSprayerSize(s); }}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                      sprayerSize === s
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-[#0e100f] text-zinc-500 border border-transparent'
                    }`}
                  >
                    {s === '15L' ? '15L Backpack' : s === '20L' ? '20L Tank' : '100L Drum'}
                  </button>
                ))}
              </div>

              {/* Callout */}
              <div className="p-3 rounded-lg bg-[#0c0e0d] border border-[#232925] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] text-zinc-400">Remedy: {selectedCrop.dosage[dosageType].name}</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    👉 {getDoseText()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-400">Estimated Cost</div>
                  <div className="text-sm font-bold text-amber-400">
                    {selectedCrop.dosage[dosageType].cost}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 font-light">
                🛡️ {selectedCrop.dosage[dosageType].safety}
              </div>
            </div>

            {/* Spray Window Banner */}
            <div className="p-3 rounded-xl bg-[#151817] border border-[#232925] flex items-center justify-between text-xs">
              <span className="text-zinc-400">Best Spray Time:</span>
              <span className="text-emerald-400 font-bold">{selectedCrop.sprayTime}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
