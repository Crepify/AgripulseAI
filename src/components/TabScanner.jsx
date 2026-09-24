import React, { useState, useRef } from 'react';
import { Camera, Upload, Volume2, VideoOff, Leaf, Calculator, Sparkles } from 'lucide-react';
import scannerPlaceholder from '../assets/scanner-placeholder.webp';
import { CROPS } from '../data/agriData';
import { analyzeLeafOnDevice } from '../utils/onDeviceModel';
import { isCloudAIConfigured, predictCropImage } from '../utils/aiService';
import { speechEngine } from '../utils/speech';
import { sound } from '../utils/audio';
import { T } from '../data/translations';
import ImageScanOverlay from './ImageScanOverlay';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The selected image could not be loaded.'));
    image.src = src;
  });
}

export default function TabScanner({ selectedLang, isSunlightMode }) {
  const t = T[selectedLang] || T['en'];
  const scannerText = { ...T.en.scanner, ...(t.scanner || {}) };
  const [selectedCrop, setSelectedCrop] = useState(CROPS[0]);
  const [hasScanResult, setHasScanResult] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inferenceSource, setInferenceSource] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [customImage, setCustomImage] = useState(null);
  const [dosageType, setDosageType] = useState('bio');
  const [sprayerSize, setSprayerSize] = useState('15L');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [mixingAcres, setMixingAcres] = useState(2);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const startCamera = async () => {
    sound.playClick();
    setHasScanResult(false);
    setCustomImage(null);
    setInferenceSource(null);
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
    setHasScanResult(false);
    setIsAnalyzing(true);
    setInferenceSource(null);
    sound.playTransition();

    try {
      const image = await loadImage(imgSrc);
      let cloudResult = null;

      if (isCloudAIConfigured) {
        try {
          const imageResponse = await fetch(imgSrc);
          if (!imageResponse.ok) throw new Error('Could not prepare the image for cloud analysis.');
          const imageBlob = await imageResponse.blob();
          const extension = imageBlob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
          cloudResult = await predictCropImage(imageBlob, `leaf-image.${extension}`);
        } catch (error) {
          console.warn('Cloud AI unavailable; falling back to on-device analysis.', error);
        }
      }

      if (cloudResult) {
        setSelectedCrop({ ...cloudResult.crop, confidence: cloudResult.confidence });
        setInferenceSource('cloud');
        if (canvasRef.current) {
          const context = canvasRef.current.getContext('2d');
          canvasRef.current.width = image.naturalWidth;
          canvasRef.current.height = image.naturalHeight;
          context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      } else {
        const localResult = await analyzeLeafOnDevice(image, canvasRef.current);
        setSelectedCrop(localResult.matchedCrop);
        setInferenceSource('device');
      }

      setHasScanResult(true);
      sound.playSuccess();
    } catch (error) {
      console.error('Could not analyze the selected crop image:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectCrop = async (crop) => {
    sound.playClick();
    setCustomImage(null);
    setHasScanResult(true);
    setSelectedCrop(crop);
    setInferenceSource(null);
    stopCamera();
    setIsAnalyzing(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = crop.image;
    img.onload = async () => {
      setTimeout(async () => {
        const res = await analyzeLeafOnDevice(img, canvasRef.current);
        setSelectedCrop(crop);
        setIsAnalyzing(false);
        sound.playSuccess();
      }, 1000);
    };
    img.onerror = () => setIsAnalyzing(false);
  };

  const playVoicePrescription = () => {
    sound.playClick();
    if (isPlayingAudio) {
      speechEngine.stopSpeaking();
      setIsPlayingAudio(false);
    } else {
      const audioData = selectedCrop.audio[selectedLang] || selectedCrop.audio['en'];
      const speechLangCode = selectedLang === 'hi' ? 'hi-IN' : selectedLang === 'ta' ? 'ta-IN' : selectedLang === 'te' ? 'te-IN' : selectedLang === 'kn' ? 'kn-IN' : 'en-IN';
      setIsPlayingAudio(true);
      speechEngine.speak(audioData, speechLangCode, () => {
        setIsPlayingAudio(false);
      });
    }
  };

  const getDoseText = () => {
    if (sprayerSize === '20L') return selectedLang === 'hi' ? '2.5 ढक्कन (40ml) दवा' : '2.5 Bottle Caps (40ml)';
    if (sprayerSize === '100L') return selectedLang === 'hi' ? '10 ढक्कन (150ml) प्रति 100L ड्रम' : '10 Bottle Caps (150ml) in 100L Drum';
    return selectedCrop.dosage[dosageType].measure;
  };

  return (
    <div className="w-full space-y-6">
      {/* Sample Crop Selector with Solid High-Contrast Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className={`text-xs whitespace-nowrap font-bold ${isSunlightMode ? 'text-zinc-900' : 'text-zinc-200'}`}>
          {t.scanner.samplesTitle}
        </span>
        {CROPS.map((c) => {
          const isSelected = hasScanResult && selectedCrop.id === c.id && !customImage && !isCameraActive;
          return (
            <button
              key={c.id}
              onClick={() => handleSelectCrop(c)}
              style={{
                backgroundColor: isSelected ? '#34d399' : isSunlightMode ? '#ffffff' : '#1f2937',
                color: isSelected ? '#000000' : isSunlightMode ? '#111827' : '#ffffff',
                borderColor: isSelected ? '#10b981' : isSunlightMode ? '#9ca3af' : '#4b5563',
                opacity: 1,
                visibility: 'visible',
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border-2 shadow-sm"
            >
              {c.name} ({c.localName})
            </button>
          );
        })}
      </div>

      {/* 2-Column Clean Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Viewfinder */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-zinc-700 min-h-[320px] flex items-center justify-center shadow-xl">
            {isCameraActive ? (
              <div className="relative w-full h-[320px]">
                <video ref={videoRef} playsInline autoPlay className="w-full h-full object-cover" />
                <button
                  onClick={capturePhoto}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full bg-emerald-400 text-black font-black text-xs shadow-xl animate-bounce border-2 border-emerald-300"
                >
                  {t.scanner.snapPhoto}
                </button>
              </div>
            ) : (
              <div className="relative w-full h-[320px] flex items-center justify-center overflow-hidden">
                <img
                  src={customImage || (hasScanResult ? selectedCrop.image : scannerPlaceholder)}
                  alt={customImage ? 'Uploaded leaf photo' : hasScanResult ? selectedCrop.name : scannerText.readyTitle}
                  className="w-full h-full object-cover"
                />
                {!hasScanResult && !customImage && (
                  <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 max-w-[90%] whitespace-nowrap rounded-full border border-emerald-300/40 bg-zinc-950/75 px-3 py-1.5 text-[9px] font-black tracking-wider text-emerald-100 shadow-lg backdrop-blur-sm">
                    <Sparkles className="mr-1 inline h-3 w-3 text-emerald-300" />{scannerText.readyBadge}
                  </div>
                )}
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />
              </div>
            )}

            <ImageScanOverlay isScanning={isAnalyzing} text={t.scanner.analyzingText} />
          </div>

          {/* Action Buttons: Camera & Upload */}
          <div className="grid grid-cols-2 gap-2.5">
            {!isCameraActive ? (
              <button
                onClick={startCamera}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs transition-transform active:scale-95 shadow-md border-2 border-emerald-300"
              >
                <Camera className="w-4 h-4" />
                <span>{t.scanner.openCamera}</span>
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black text-xs shadow-md border-2 border-red-400"
              >
                <VideoOff className="w-4 h-4" />
                <span>{t.scanner.closeCamera}</span>
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
              style={{
                backgroundColor: isSunlightMode ? '#ffffff' : '#1f2937',
                color: isSunlightMode ? '#111827' : '#ffffff',
                borderColor: isSunlightMode ? '#9ca3af' : '#4b5563',
              }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs transition-all border-2 shadow-sm"
            >
              <Upload className="w-4 h-4" />
              <span>{t.scanner.uploadPhoto}</span>
            </button>
          </div>
        </div>

        {/* Right: Diagnosis & Dosage */}
        <div className="lg:col-span-7">
          {!hasScanResult ? (
            <div className={`min-h-[320px] h-full p-7 sm:p-9 rounded-2xl border-2 flex flex-col items-center justify-center text-center shadow-xl ${
              isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-white'
            }`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isSunlightMode ? 'bg-emerald-100' : 'bg-emerald-400/15'}`}>
                <Sparkles className="w-7 h-7 text-emerald-500" />
              </div>
              {!isAnalyzing && (
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-2">
                  {scannerText.readyBadge}
                </span>
              )}
              <h2 className={`text-xl sm:text-2xl font-black ${isSunlightMode ? 'text-zinc-900' : 'text-white'}`}>
                {isAnalyzing ? scannerText.analyzingTitle : scannerText.readyTitle}
              </h2>
              <p className={`max-w-md mt-2 text-sm leading-relaxed ${isSunlightMode ? 'text-zinc-600' : 'text-zinc-300'}`}>
                {isAnalyzing ? scannerText.analyzingDescription : scannerText.readyDescription}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`p-6 rounded-2xl border-2 space-y-5 shadow-xl ${
            isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-white'
          }`}>
            {/* Title & Listen Button */}
            <div className={`flex flex-wrap items-center justify-between gap-3 pb-4 border-b-2 ${isSunlightMode ? 'border-zinc-200' : 'border-zinc-800'}`}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-emerald-400 font-black tracking-wide">
                    {t.scanner.scanComplete} ({selectedCrop.confidence}% {t.scanner.matchScore})
                  </span>
                  {inferenceSource && (
                    <span
                      title={inferenceSource === 'cloud'
                        ? 'Prediction returned by the configured cloud AI endpoint.'
                        : isCloudAIConfigured
                          ? 'Cloud prediction was unavailable or did not match a supported crop; using on-device analysis.'
                          : 'Using on-device analysis. Configure VITE_AI_API_KEY to enable the cloud endpoint.'}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        inferenceSource === 'cloud'
                          ? 'bg-emerald-100 text-emerald-800'
                          : isSunlightMode ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {inferenceSource === 'cloud' ? 'Cloud AI' : 'On-device'}
                    </span>
                  )}
                </div>
                <h2 className={`text-xl md:text-2xl font-black mt-0.5 ${isSunlightMode ? 'text-zinc-900' : 'text-white'}`}>
                  {selectedCrop.disease}
                </h2>
              </div>

              <button
                onClick={playVoicePrescription}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md border-2 ${
                  isPlayingAudio
                    ? 'bg-red-500 text-white border-red-400 animate-pulse'
                    : 'bg-emerald-400 hover:bg-emerald-300 text-black border-emerald-300'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>{isPlayingAudio ? t.scanner.stopVoice : t.scanner.listenAdvice}</span>
              </button>
            </div>

            {/* Symptoms */}
            <p className={`text-xs font-medium leading-relaxed ${isSunlightMode ? 'text-zinc-800' : 'text-zinc-200'}`}>
              <strong>{t.scanner.symptomsLabel}</strong> {selectedCrop.symptoms}
            </p>

            {/* Dosage Recipe Box with Visual Graphic */}
            <div className={`p-4 rounded-xl border-2 space-y-3.5 ${
              isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-950 border-zinc-800'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-xs font-black flex items-center gap-1.5 ${isSunlightMode ? 'text-zinc-900' : 'text-white'}`}>
                  <Leaf className="w-4 h-4 text-emerald-400" />
                  {t.scanner.recipeTitle}
                </span>

                {/* Bio vs Chemical Toggle */}
                <div className={`flex items-center p-1 rounded-lg border-2 text-xs ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700'}`}>
                  <button
                    onClick={() => { sound.playClick(); setDosageType('bio'); }}
                    className={`px-3 py-1 rounded font-black transition-all ${
                      dosageType === 'bio' ? 'bg-emerald-400 text-black shadow-sm' : isSunlightMode ? 'text-zinc-700' : 'text-zinc-300'
                    }`}
                  >
                    {t.scanner.organicBio}
                  </button>
                  <button
                    onClick={() => { sound.playClick(); setDosageType('chemical'); }}
                    className={`px-3 py-1 rounded font-black transition-all ${
                      dosageType === 'chemical' ? 'bg-amber-400 text-black shadow-sm' : isSunlightMode ? 'text-zinc-700' : 'text-zinc-300'
                    }`}
                  >
                    {t.scanner.chemical}
                  </button>
                </div>
              </div>

              {/* Sprayer Equipment Selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className={`font-bold ${isSunlightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>{t.scanner.sprayerLabel}</span>
                {['15L', '20L', '100L'].map((s) => (
                  <button
                    key={s}
                    onClick={() => { sound.playClick(); setSprayerSize(s); }}
                    style={{
                      backgroundColor: sprayerSize === s ? '#34d399' : isSunlightMode ? '#ffffff' : '#1f2937',
                      color: sprayerSize === s ? '#000000' : isSunlightMode ? '#111827' : '#ffffff',
                      borderColor: sprayerSize === s ? '#10b981' : isSunlightMode ? '#9ca3af' : '#4b5563',
                    }}
                    className="px-3 py-1 rounded text-xs font-black transition-all border-2 shadow-sm"
                  >
                    {s === '15L' ? t.scanner.backpack15 : s === '20L' ? t.scanner.tank20 : t.scanner.drum100}
                  </button>
                ))}
              </div>

              {/* Visual Bottle-Cap Sprayer Recipe Card */}
              <div className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
                isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-400/20 border-2 border-emerald-400 flex items-center justify-center text-2xl shrink-0">
                    🧴
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-zinc-400">{t.scanner.remedyLabel} {selectedCrop.dosage[dosageType].name}</div>
                    <div className="text-base md:text-lg font-black text-emerald-400 mt-0.5">
                      👉 {getDoseText()}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 border-t sm:border-t-0 sm:border-l border-zinc-700/60 pt-2 sm:pt-0 sm:pl-4">
                  <div className="text-[11px] font-bold text-zinc-400">{t.scanner.estCost}</div>
                  <div className="text-base font-black text-amber-400">
                    {selectedCrop.dosage[dosageType].cost}
                  </div>
                </div>
              </div>

              <div className="text-xs text-zinc-300 font-medium">
                🛡️ {selectedCrop.dosage[dosageType].safety}
              </div>
            </div>

            {/* Field Size Mixing Multiplier Tool */}
            <div className={`p-3.5 rounded-xl border-2 space-y-2 shadow-sm ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-950 border-zinc-800'}`}>
              <div className="flex items-center justify-between text-xs font-black">
                <span className="flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  {t.scanner.calculatorTitle}
                </span>
                <span className="text-emerald-400 font-black">{mixingAcres} {t.profit.selectedAcres}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={mixingAcres}
                onChange={(e) => setMixingAcres(Number(e.target.value))}
                className="w-full h-2 bg-zinc-600 rounded appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex justify-between text-xs text-zinc-300 font-bold">
                <span>{t.scanner.totalMixNeeded} <strong>{mixingAcres * 150}L ({mixingAcres * 10} Tanks)</strong></span>
                <span className="text-emerald-400 font-black">{t.scanner.bottlesCapsTotal} {mixingAcres * 20} Caps</span>
              </div>
            </div>

            {/* Spray Window Banner */}
            <div className={`p-3.5 rounded-xl border-2 flex items-center justify-between text-xs font-black ${
              isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-950 border-zinc-800'
            }`}>
              <span className={isSunlightMode ? 'text-zinc-700' : 'text-zinc-300'}>{t.scanner.sprayTimeLabel}</span>
              <span className="text-emerald-400">{selectedCrop.sprayTime}</span>
            </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
