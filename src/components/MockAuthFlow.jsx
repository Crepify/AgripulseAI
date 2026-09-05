import React, { useState } from 'react';
import { ArrowLeft, KeyRound, ShieldCheck, Mail } from 'lucide-react';
import { sound } from '../utils/audio';

export default function MockAuthFlow({ onSuccess, onCancel }) {
  const [step, setStep] = useState('login'); // 'login' | '2fa' | 'success'
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const handleGoogleLogin = () => {
    sound.playClick();
    setTimeout(() => {
      setStep('2fa');
    }, 800);
  };

  const handleOtpChange = (index, value) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    sound.playClick();
    
    // Auto submit if all filled
    if (index === 5 && value && newOtp.every(v => v !== '')) {
      setTimeout(() => {
        setStep('success');
        setTimeout(() => {
          onSuccess();
        }, 1200);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-lg border border-zinc-200 overflow-hidden relative">
        {step !== 'success' && (
          <button 
            onClick={onCancel}
            className="absolute top-4 left-4 p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="p-8 pt-12 flex flex-col items-center text-center">
          {step === 'login' && (
            <>
              <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 mb-2">Secure Login</h2>
              <p className="text-sm text-zinc-500 mb-8">Access your farm data securely and privately.</p>

              <button 
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-zinc-200 text-zinc-700 font-bold py-3 px-4 rounded-xl hover:bg-zinc-50 transition-colors"
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                Continue with Google
              </button>
            </>
          )}

          {step === '2fa' && (
            <>
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                <KeyRound className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 mb-2">Two-Factor Auth</h2>
              <p className="text-sm text-zinc-500 mb-8">Enter the 6-digit code sent to your device.</p>

              <div className="flex gap-2 justify-center mb-6">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    className="w-10 h-12 text-center text-lg font-bold border-2 border-zinc-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <p className="text-xs text-zinc-400">Mock mode: enter any digits to proceed.</p>
            </>
          )}

          {step === 'success' && (
            <div className="py-8 flex flex-col items-center animate-pulse">
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-emerald-600">Verified & Encrypted</h2>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
