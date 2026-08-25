// =============================================================
// SHIVBAEMPIRE — Flash / Splash Screen Component
// Displays on initial app load with premium animations
// =============================================================
import { useState, useEffect } from 'react';
import { Shield, Sparkles, Flame } from 'lucide-react';

export default function SplashScreen({ onFinish }) {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // Start fade-out at 1.4s, complete at 1.8s
    const fadeTimer = setTimeout(() => setFade(true), 1400);
    const finishTimer = setTimeout(() => onFinish(), 1800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white transition-opacity duration-500 ${
        fade ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background ambient glow */}
      <div className="absolute w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Animated Emblem */}
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 p-1 shadow-2xl shadow-orange-500/40">
            <img
              src="/logo.png"
              alt="Shivba Empire Emblem"
              className="w-full h-full object-cover rounded-xl border border-amber-400/30"
            />
          </div>
          <Sparkles size={20} className="absolute -top-2 -right-2 text-amber-300 animate-spin" />
        </div>

        {/* App Name */}
        <h1 className="text-4xl font-extrabold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-orange-400 to-amber-500 drop-shadow-md">
          SHIVBAEMPIRE
        </h1>

        {/* Decorative divider */}
        <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent my-3" />

        {/* Organization Name */}
        <p className="text-sm font-medium text-gray-400 tracking-wider uppercase">
          Shivba Tarun Mitra Mandal
        </p>

        {/* Animated Loader Bar */}
        <div className="w-48 h-1 bg-gray-800 rounded-full mt-8 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-progress" />
        </div>
      </div>
    </div>
  );
}
