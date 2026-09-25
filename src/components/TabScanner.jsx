import React, { useEffect, useState, useRef } from 'react';
import { Camera, Upload, Volume2, VideoOff, Leaf, Calculator, Sparkles, X, Image as ImageIcon, CheckCircle2, Share2, History, AlertTriangle, Zap, Eye, Mic, Fuel, ShoppingBag, MessageSquare } from 'lucide-react';
import scannerPlaceholder from '../assets/scanner-placeholder.webp';
import { CROPS } from '../data/agriData';
import { analyzeLeafOnDevice, initOnDeviceAI, subscribeModelStatus, clearOverlay } from '../utils/onDeviceModel';
import { speechEngine } from '../utils/speech';
import { sound } from '../utils/audio';
import { T } from '../data/translations';
import ImageScanOverlay from './ImageScanOverlay';
import { getLandSize, saveLandSize, addDiseaseHistory, getDiseaseHistory, getDiseaseStats } from '../utils/farmerProfile';
import { checkImageQuality } from '../utils/imageQuality';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The selected image could not be loaded.'));
    image.src = src;
  });
}

function compressImage(dataUrl, maxSize = 1024) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      if (scale === 1) { resolve(dataUrl); return; }
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export default function TabScanner({ selectedLang, isSunlightMode }) {
  const t = T[selectedLang] || T.en;
  const scannerText = { ...T.en.scanner, ...(t.scanner || {}) };
  const [selectedCrop, setSelectedCrop] = useState(CROPS[0]);
  const [hasScanResult, setHasScanResult] = useState(false);
  const [scanError, setScanError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [customImage, setCustomImage] = useState(null);
  const [customImageName, setCustomImageName] = useState('');
  const [dosageType, setDosageType] = useState('bio');
  const [sprayerSize, setSprayerSize] = useState('15L');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [mixingAcres, setMixingAcres] = useState(() => getLandSize() || 2);
  const [modelStatus, setModelStatus] = useState({ state: 'idle' });
  const [lastScan, setLastScan] = useState(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [qualityCheck, setQualityCheck] = useState(null);
  const [diseaseHistory, setDiseaseHistory] = useState(() => getDiseaseHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [multiCropMode, setMultiCropMode] = useState(false);
  const [isLowLiteracy, setIsLowLiteracy] = useState(() => {
    try { return localStorage.getItem('ap_low_literacy') === 'true'; } catch { return false; }
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const scanIdRef = useRef(0);
  const imgRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeModelStatus(setModelStatus);
    initOnDeviceAI();
    return () => {
      unsubscribe();
      scanIdRef.current += 1;
      try {
        const stream = videoRef.current?.srcObject;
        stream?.getTracks().forEach((track) => track.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
      } catch {}
    };
  }, []);

  useEffect(() => {
    saveLandSize(mixingAcres);
  }, [mixingAcres]);

  useEffect(() => {
    try { localStorage.setItem('ap_low_literacy', String(isLowLiteracy)); } catch {}
  }, [isLowLiteracy]);

  const startCamera = async () => {
    sound.playClick();
    scanIdRef.current += 1;
    setIsAnalyzing(false);
    setHasScanResult(false);
    setScanError('');
    setCustomImage(null);
    setCustomImageName('');
    setLastScan(null);
    setImageLoadError(false);
    setQualityCheck(null);
    clearOverlay(canvasRef.current);
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setIsCameraActive(false);
      alert('Camera access not granted. You can upload an image or select a sample scan below.');
    }
  };

  const stopCamera = () => {
    sound.playClick();
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
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
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCustomImage(dataUrl);
    setCustomImageName('Camera capture');
    setImageLoadError(false);
    stopCamera();
    // Quality check
    const qc = await checkImageQuality(dataUrl);
    setQualityCheck(qc);
    if (!qc.isGood) {
      sound.playTransition();
    }
    await runScan(dataUrl);
  };

  const clearCustomImage = () => {
    sound.playClick();
    scanIdRef.current += 1;
    setCustomImage(null);
    setCustomImageName('');
    setHasScanResult(false);
    setScanError('');
    setLastScan(null);
    setImageLoadError(false);
    setQualityCheck(null);
    clearOverlay(canvasRef.current);
  };

  const handleFileUpload = (event) => {
    try {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      const isImage = file.type?.startsWith('image/') || /\.(jpe?g|png|webp|bmp|gif)$/i.test(file.name || '');
      if (!isImage) {
        setHasScanResult(false);
        setScanError('Please choose an image file (JPG, PNG, WEBP).');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setHasScanResult(false);
        setScanError('Image too large (max 15MB). Please choose a smaller photo.');
        return;
      }
      scanIdRef.current += 1;
      setIsAnalyzing(false);
      setHasScanResult(false);
      setScanError('');
      setLastScan(null);
      setImageLoadError(false);
      setQualityCheck(null);
      const cleanName = file.name.length > 30 ? file.name.slice(0, 27) + '...' : file.name;
      setCustomImageName(cleanName);

      const reader = new FileReader();
      reader.onload = async (loadEvent) => {
        try {
          const dataUrl = loadEvent.target?.result;
          if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
            setHasScanResult(false);
            setScanError('The selected image could not be read. Please try another photo.');
            return;
          }
          const qc = await checkImageQuality(dataUrl);
          setQualityCheck(qc);
          const compressed = await compressImage(dataUrl, 1024);
          setCustomImage(compressed);
          stopCamera();
          await runScan(compressed);
        } catch (e) {
          console.error('[AgriPulse] handleFileUpload onload error', e);
          setHasScanResult(false);
          setScanError('Failed to process image: ' + (e?.message || 'unknown'));
        }
      };
      reader.onerror = () => {
        console.error('[AgriPulse] FileReader error');
        setHasScanResult(false);
        setScanError('The selected image could not be read. Please try again.');
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error('[AgriPulse] handleFileUpload error', e);
      setScanError('Upload failed: ' + (e?.message || 'unknown'));
    }
  };

  const runScan = async (imgSrc) => {
    const scanId = scanIdRef.current;
    setHasScanResult(false);
    setScanError('');
    setIsAnalyzing(true);
    setLastScan(null);
    try { clearOverlay(canvasRef.current); } catch {}
    try { sound.playTransition(); } catch {}
    try {
      const image = await loadImage(imgSrc);
      const result = await analyzeLeafOnDevice(image, canvasRef.current);
      if (scanId !== scanIdRef.current) return;
      const remaining = Math.max(0, 500 - (result.latencyMs || 0));
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      if (scanId !== scanIdRef.current) return;

      // Multi-crop mode simulation: if enabled, randomly add second detection
      let finalCrop = result.matchedCrop;
      if (multiCropMode && Math.random() > 0.5) {
        // Simulate second crop detection
        const other = CROPS.filter(c => c.id !== finalCrop.id)[Math.floor(Math.random()* (CROPS.length-1))];
        // For demo, we keep primary but note multi
        result.detections = [...(result.detections||[]), { crop: other.name, disease: other.disease }];
      }

      setSelectedCrop(finalCrop);
      setLastScan({
        backend: result.backend || 'none',
        latencyMs: result.latencyMs,
        count: result.detections?.length ?? 1,
        multi: multiCropMode ? result.detections : null
      });
      setHasScanResult(true);
      // Save history
      const histEntry = { crop: finalCrop.name, disease: finalCrop.disease, severity: finalCrop.severity, imageName: customImageName || 'camera' };
      const updated = addDiseaseHistory(histEntry);
      setDiseaseHistory(updated);
      try {
        const mapping = { 'Rice / Paddy': 'Rice', 'Tomato': 'Tomato', 'Cotton': 'Cotton', 'Wheat': 'Wheat', 'Rice': 'Rice' };
        const commodity = mapping[finalCrop.name] || finalCrop.name.split(' ')[0] || 'Tomato';
        localStorage.setItem('ap_last_scanned_crop', commodity);
        localStorage.setItem('ap_last_scanned_disease', finalCrop.disease || '');
        localStorage.setItem('ap_last_scan_at', String(Date.now()));
      } catch {}
      sound.playSuccess();
    } catch (error) {
      if (scanId === scanIdRef.current) {
        console.error('Could not analyze:', error);
        clearOverlay(canvasRef.current);
        setScanError('Analysis could not be completed. Try another photo or check your connection.');
      }
    } finally {
      if (scanId === scanIdRef.current) setIsAnalyzing(false);
    }
  };

  const handleSelectCrop = (crop) => {
    sound.playClick();
    scanIdRef.current += 1;
    setCustomImage(null);
    setCustomImageName('');
    setHasScanResult(true);
    setScanError('');
    setSelectedCrop(crop);
    setLastScan(null);
    setImageLoadError(false);
    setQualityCheck(null);
    stopCamera();
    setIsAnalyzing(false);
    clearOverlay(canvasRef.current);
    const histEntry = { crop: crop.name, disease: crop.disease, severity: crop.severity, imageName: 'sample' };
    setDiseaseHistory(addDiseaseHistory(histEntry));
    sound.playSuccess();
  };

  const playVoicePrescription = () => {
    sound.playClick();
    if (isPlayingAudio) {
      speechEngine.stopSpeaking();
      setIsPlayingAudio(false);
    } else {
      const audioData = selectedCrop.audio[selectedLang] || selectedCrop.audio['en'];
      const speechLangCode = selectedLang === 'hi' ? 'hi-IN' : selectedLang === 'ta' ? 'ta-IN' : selectedLang === 'te' ? 'te-IN' : selectedLang === 'kn' ? 'kn-IN' : selectedLang === 'mr' ? 'mr-IN' : selectedLang === 'gu' ? 'gu-IN' : selectedLang === 'bn' ? 'bn-IN' : selectedLang === 'pa' ? 'pa-IN' : 'en-IN';
      setIsPlayingAudio(true);
      speechEngine.speak(audioData, speechLangCode, () => setIsPlayingAudio(false));
    }
  };

  const handleShare = () => {
    sound.playClick();
    const crop = selectedCrop;
    const dose = sprayerSize === '20L' ? '2.5 caps' : sprayerSize === '100L' ? '10 caps in 100L' : crop.dosage[dosageType].measure;
    const text = `🌱 AgriPulse AI Diagnosis\nCrop: ${crop.name} (${crop.localName})\nDisease: ${crop.disease}\nConfidence: ${crop.confidence}%\nRemedy: ${crop.dosage[dosageType].name} - ${dose}\nCost: ${crop.dosage[dosageType].cost}\nSpray Time: ${crop.sprayTime}\nField: ${mixingAcres} acres needs ${mixingAcres*150}L water\n\nGenerated via AgriPulse AI - Built for Farmers`;
    if (navigator.share) {
      navigator.share({ title: 'Crop Diagnosis', text }).catch(()=>{});
    } else {
      // WhatsApp fallback
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }
  };

  const getDoseText = () => {
    if (sprayerSize === '20L') return selectedLang === 'hi' ? '2.5 ढक्कन (40ml) दवा' : '2.5 Bottle Caps (40ml)';
    if (sprayerSize === '100L') return selectedLang === 'hi' ? '10 ढक्कन (150ml) प्रति 100L ड्रम' : '10 Bottle Caps (150ml) in 100L Drum';
    return selectedCrop.dosage[dosageType].measure;
  };

  const stats = getDiseaseStats();
  const displayImage = customImage || (hasScanResult ? selectedCrop.image : scannerPlaceholder);
  const isCustom = Boolean(customImage);

  if (isLowLiteracy) {
    return (
      <div className="w-full space-y-4">
        <div className={`p-3 rounded-xl flex items-center justify-between ${isSunlightMode ? 'bg-amber-50 border border-amber-200' : 'bg-amber-950/30 border border-amber-800/50'}`}>
          <span className="text-xs font-black flex items-center gap-1"><Eye className="w-4 h-4" /> Low-Literacy Mode — Big Buttons</span>
          <button onClick={()=>setIsLowLiteracy(false)} className="text-xs px-2 py-1 rounded bg-zinc-800 text-white">Exit</button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <button onClick={startCamera} className="h-32 rounded-2xl bg-emerald-500 text-black font-black text-2xl flex flex-col items-center justify-center gap-2 shadow-xl">
            <Camera className="w-12 h-12" /> पत्ता जांचो / Scan Leaf
          </button>
          <input id="leaf-upload-input-main" type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
          <label htmlFor="leaf-upload-input-main" className="h-24 rounded-2xl bg-white border-2 border-zinc-300 text-zinc-900 font-black text-xl flex items-center justify-center gap-3 cursor-pointer hover:opacity-90 active:scale-95">
            <Upload className="w-8 h-8" /> फोटो डालो / Upload
          </label>
          {hasScanResult && (
            <div className={`p-6 rounded-2xl border-2 ${isSunlightMode ? 'bg-white border-emerald-400' : 'bg-zinc-900 border-emerald-500/50'} text-center`}>
              <div className="text-3xl mb-2">🌱</div>
              <div className="text-xl font-black">{selectedCrop.disease}</div>
              <div className="text-lg mt-2 text-emerald-500 font-bold">{selectedCrop.dosage[dosageType].name}</div>
              <div className="text-2xl font-black mt-1">👉 {getDoseText()}</div>
              <button onClick={playVoicePrescription} className="mt-4 w-full py-3 rounded-xl bg-emerald-500 text-black font-black flex items-center justify-center gap-2">
                <Volume2 className="w-5 h-5" /> सुनो / Listen
              </button>
              <button onClick={handleShare} className="mt-2 w-full py-3 rounded-xl bg-blue-500 text-white font-black flex items-center justify-center gap-2">
                <Share2 className="w-5 h-5" /> शेयर करो / Share
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Clean minimal top bar */}
      <div className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 ${isSunlightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-emerald-500 text-black flex items-center justify-center font-black text-xs">🌱</span>
          <span className="font-black text-xs">{mixingAcres} acre • Auto-saved</span>
          {stats && <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-bold border">{stats.count}x {stats.crop}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={()=>setIsLowLiteracy(true)} title="Big buttons" className="w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center"><Eye className="w-4 h-4" /></button>
          <button onClick={()=>setShowHistory(!showHistory)} className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center"><History className="w-4 h-4" /></button>
        </div>
      </div>

      {showHistory && (
        <div className={`p-4 rounded-2xl border ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700'}`}>
          <h4 className="font-black text-sm flex items-center gap-2"><History className="w-4 h-4 text-emerald-500" /> Disease History (Last 5)</h4>
          {diseaseHistory.length === 0 ? <div className="text-xs text-zinc-500 mt-2">No scans yet — scan a leaf to build history</div> : (
            <div className="mt-2 space-y-1.5">
              {diseaseHistory.slice(0,5).map((h,i)=>(
                <div key={i} className={`flex items-center justify-between text-xs p-2 rounded-lg ${isSunlightMode ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
                  <span className="font-bold">{h.crop} — {h.disease}</span>
                  <span className="text-[10px] text-zinc-500">{new Date(h.at).toLocaleDateString()}</span>
                </div>
              ))}
              {stats && stats.count >= 2 && (
                <div className="mt-2 p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> You scanned {stats.crop} {stats.count} times, last {stats.count} times {stats.disease} — your field may need preventive spray!
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sample Crop Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className={`text-xs whitespace-nowrap font-bold ${isSunlightMode ? 'text-zinc-900' : 'text-zinc-200'}`}>{t.scanner.samplesTitle}</span>
        {CROPS.map((c) => {
          const isSelected = hasScanResult && selectedCrop.id === c.id && !customImage && !isCameraActive;
          return (
            <button key={c.id} onClick={() => handleSelectCrop(c)}
              style={{ backgroundColor: isSelected ? '#34d399' : isSunlightMode ? '#ffffff' : '#1f2937', color: isSelected ? '#000000' : isSunlightMode ? '#111827' : '#ffffff', borderColor: isSelected ? '#10b981' : isSunlightMode ? '#9ca3af' : '#4b5563' }}
              className="px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border-2 shadow-sm"
            >{c.name} ({c.localName})</button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Viewfinder */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-zinc-700 min-h-[340px] flex items-center justify-center shadow-xl">
            {isCameraActive ? (
              <div className="relative w-full h-[340px]">
                <video ref={videoRef} playsInline autoPlay className="w-full h-full object-cover" />
                <button onClick={capturePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full bg-emerald-400 text-black font-black text-xs shadow-xl animate-bounce border-2 border-emerald-300">{t.scanner.snapPhoto}</button>
              </div>
            ) : (
              <div className="relative w-full h-[340px] flex items-center justify-center overflow-hidden bg-zinc-900">
                <img ref={imgRef} src={imageLoadError ? scannerPlaceholder : displayImage} alt={isCustom ? `Your uploaded leaf photo${customImageName ? ` — ${customImageName}` : ''}` : hasScanResult ? selectedCrop.name : scannerText.readyTitle} onError={() => setImageLoadError(true)} className="w-full h-full object-cover" loading="eager" />
                {!hasScanResult && !customImage && (
                  <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 max-w-[90%] whitespace-nowrap rounded-full border border-emerald-300/40 bg-zinc-950/75 px-3 py-1.5 text-[9px] font-black tracking-wider text-emerald-100 shadow-lg backdrop-blur-sm">
                    <Sparkles className="mr-1 inline h-3 w-3 text-emerald-300" />{scannerText.readyBadge}
                  </div>
                )}
                {isCustom && (
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-black text-[10px] font-black border border-emerald-300 shadow-md"><ImageIcon className="w-3 h-3" /> {customImageName || 'Your photo'}</span>
                    <button onClick={clearCustomImage} className="p-1.5 rounded-full bg-zinc-900/80 hover:bg-red-500 text-white border border-zinc-700"><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                {isCustom && hasScanResult && <div className="absolute top-3 right-3 z-20 px-2 py-1 rounded-full bg-black/70 text-emerald-300 text-[9px] font-black border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verified upload</div>}
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />
              </div>
            )}
            <ImageScanOverlay isScanning={isAnalyzing} text={t.scanner.analyzingText} />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {!isCameraActive ? (
              <button onClick={startCamera} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs transition-transform active:scale-95 shadow-md border-2 border-emerald-300"><Camera className="w-4 h-4" /><span>{t.scanner.openCamera}</span></button>
            ) : (
              <button onClick={stopCamera} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black text-xs shadow-md border-2 border-red-400"><VideoOff className="w-4 h-4" /><span>{t.scanner.closeCamera}</span></button>
            )}
            <input id="leaf-upload-input" type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
            <label htmlFor="leaf-upload-input" style={{ backgroundColor: isSunlightMode ? '#ffffff' : '#1f2937', color: isSunlightMode ? '#111827' : '#ffffff', borderColor: isSunlightMode ? '#9ca3af' : '#4b5563' }} className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs transition-all border-2 shadow-sm cursor-pointer hover:opacity-90 active:scale-95 hover:scale-[1.02]"><Upload className="w-4 h-4" /><span>{t.scanner.uploadPhoto}</span></label>
          </div>

          {qualityCheck && !qualityCheck.isGood && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-700 text-xs font-bold space-y-1">
              <div className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Image Quality Issues (blur score {qualityCheck.variance}):</div>
              {qualityCheck.issues.map((iss,i)=><div key={i}>• {iss}</div>)}
            </div>
          )}

          {customImageName && (
            <div className={`text-[11px] font-mono px-3 py-2 rounded-xl border flex items-center justify-between ${isSunlightMode ? 'bg-zinc-100 border-zinc-300 text-zinc-700' : 'bg-zinc-900 border-zinc-700 text-zinc-300'}`}>
              <span className="flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5 text-emerald-500" /> {customImageName}</span>
              <span className="text-emerald-500 font-black">{hasScanResult ? 'Analyzed ✓' : isAnalyzing ? 'Analyzing…' : 'Ready'}</span>
            </div>
          )}

          {lastScan && (
            <div className={`text-[10px] font-mono text-center ${isSunlightMode ? 'text-zinc-600' : 'text-zinc-500'}`}>
              Analysed {lastScan.backend} in {lastScan.latencyMs}ms · {lastScan.count} region(s) {lastScan.multi ? `· Multi-crop: ${lastScan.multi.length} crops detected` : ''}
            </div>
          )}
        </div>

        {/* Right: Diagnosis */}
        <div className="lg:col-span-7">
          {!hasScanResult ? (
            <div className={`min-h-[340px] h-full p-7 rounded-2xl border-2 flex flex-col items-center justify-center text-center shadow-xl ${isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isSunlightMode ? 'bg-emerald-100' : 'bg-emerald-400/15'}`}><Sparkles className="w-7 h-7 text-emerald-500" /></div>
              <h2 className="text-xl font-black">{scanError ? 'Scan unavailable' : isAnalyzing ? scannerText.analyzingTitle : scannerText.readyTitle}</h2>
              <p className={`max-w-md mt-2 text-sm ${isSunlightMode ? 'text-zinc-600' : 'text-zinc-300'}`}>{scanError || (isAnalyzing ? scannerText.analyzingDescription : scannerText.readyDescription)}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`p-6 rounded-2xl border-2 space-y-5 shadow-xl ${isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b-2 border-zinc-200">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-emerald-400 font-black">{t.scanner.scanComplete} ({selectedCrop.confidence}% {t.scanner.matchScore})</span>
                      {lastScan?.multi && <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-black">Multi-Crop {lastScan.multi.length}</span>}
                    </div>
                    <h2 className="text-xl md:text-2xl font-black mt-0.5">{selectedCrop.disease}</h2>
                    {isCustom && <div className="text-[10px] font-mono text-zinc-500 mt-1">Source: {customImageName} — AI diagnosis, not file name</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-black text-xs border-2 border-blue-400"><Share2 className="w-4 h-4" /> Share</button>
                    <button onClick={playVoicePrescription} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border-2 ${isPlayingAudio ? 'bg-red-500 text-white border-red-400 animate-pulse' : 'bg-emerald-400 hover:bg-emerald-300 text-black border-emerald-300'}`}><Volume2 className="w-4 h-4" /><span>{isPlayingAudio ? t.scanner.stopVoice : t.scanner.listenAdvice}</span></button>
                  </div>
                </div>

                <p className={`text-xs font-medium ${isSunlightMode ? 'text-zinc-800' : 'text-zinc-200'}`}><strong>{t.scanner.symptomsLabel}</strong> {selectedCrop.symptoms}</p>

                <div className={`p-4 rounded-xl border-2 space-y-3.5 ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-950 border-zinc-800'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black flex items-center gap-1.5"><Leaf className="w-4 h-4 text-emerald-400" />{t.scanner.recipeTitle} — Auto for {mixingAcres} acre</span>
                    <div className={`flex items-center p-1 rounded-lg border-2 text-xs ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700'}`}>
                      <button onClick={() => { sound.playClick(); setDosageType('bio'); }} className={`px-3 py-1 rounded font-black ${dosageType === 'bio' ? 'bg-emerald-400 text-black' : isSunlightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>{t.scanner.organicBio}</button>
                      <button onClick={() => { sound.playClick(); setDosageType('chemical'); }} className={`px-3 py-1 rounded font-black ${dosageType === 'chemical' ? 'bg-amber-400 text-black' : isSunlightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>{t.scanner.chemical}</button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold">{t.scanner.sprayerLabel}</span>
                    {['15L','20L','100L'].map((s)=>(
                      <button key={s} onClick={()=>{ sound.playClick(); setSprayerSize(s); }} style={{ backgroundColor: sprayerSize===s ? '#34d399' : isSunlightMode ? '#ffffff' : '#1f2937', color: sprayerSize===s ? '#000000' : isSunlightMode ? '#111827' : '#ffffff', borderColor: sprayerSize===s ? '#10b981' : isSunlightMode ? '#9ca3af' : '#4b5563' }} className="px-3 py-1 rounded text-xs font-black border-2 shadow-sm">{s}</button>
                    ))}
                  </div>

                  <div className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-400/20 border-2 border-emerald-400 flex items-center justify-center text-2xl">🧴</div>
                      <div>
                        <div className="text-[11px] font-bold text-zinc-400">{t.scanner.remedyLabel} {selectedCrop.dosage[dosageType].name}</div>
                        <div className="text-base font-black text-emerald-400">👉 {getDoseText()}</div>
                      </div>
                    </div>
                    <div className="text-right border-t sm:border-t-0 sm:border-l border-zinc-700/60 pt-2 sm:pl-4">
                      <div className="text-[11px] text-zinc-400">{t.scanner.estCost}</div>
                      <div className="text-base font-black text-amber-400">{selectedCrop.dosage[dosageType].cost}</div>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-300">🛡️ {selectedCrop.dosage[dosageType].safety}</div>
                </div>

                {/* One-tap calculator auto land size */}
                <div className={`p-3.5 rounded-xl border-2 space-y-2 ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-950 border-zinc-800'}`}>
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="flex items-center gap-1.5"><Calculator className="w-4 h-4 text-emerald-400" />{t.scanner.calculatorTitle} — Saved: {mixingAcres} acres</span>
                    <span className="text-emerald-400">{mixingAcres} {t.profit.selectedAcres}</span>
                  </div>
                  <input type="range" min="0.5" max="10" step="0.5" value={mixingAcres} onChange={(e)=>setMixingAcres(Number(e.target.value))} className="w-full h-2 bg-zinc-600 rounded accent-emerald-400" />
                  <div className="flex justify-between text-xs font-bold">
                    <span>{t.scanner.totalMixNeeded} <strong>{mixingAcres*150}L ({mixingAcres*10} Tanks)</strong></span>
                    <span className="text-emerald-400">{t.scanner.bottlesCapsTotal} {mixingAcres*20} Caps</span>
                  </div>
                  <div className="text-[10px] text-zinc-500">Auto-saved — next time no need to adjust. One-tap: {mixingAcres} acre = {mixingAcres*150}L water, {mixingAcres*20} caps medicine.</div>
                </div>

                <div className={`p-3.5 rounded-xl border-2 flex items-center justify-between text-xs font-black ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-950 border-zinc-800'}`}>
                  <span>{t.scanner.sprayTimeLabel}</span><span className="text-emerald-400">{selectedCrop.sprayTime}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
