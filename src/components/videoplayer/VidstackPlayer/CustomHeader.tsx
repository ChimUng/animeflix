"use client"
import React, { useEffect, useRef, useState } from 'react';

interface CustomHeaderProps {
  brandName?: string;
  episodeNum?: number;
  autoHide?: boolean;
  hideDelay?: number;
}

export const CustomHeader: React.FC<CustomHeaderProps> = ({
  brandName = "Animeflix",
  episodeNum,
  autoHide = true,
  hideDelay = 2000,
}) => {
  const [showHeader, setShowHeader] = useState(true);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!autoHide) return;

    const resetTimer = () => {
      setShowHeader(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowHeader(false), hideDelay);
    };

    // Initial hide
    resetTimer();

    // Listen to interactions
    const handleInteraction = () => resetTimer();
    
    document.addEventListener('mousemove', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      document.removeEventListener('mousemove', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autoHide, hideDelay]);

  return (
    <div 
      className={`absolute top-4 right-4 z-50 transition-all duration-500 pointer-events-none ${
        showHeader ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="flex items-center gap-3 bg-black/80 backdrop-blur-xl px-4 py-2.5 rounded-xl shadow-2xl border border-white/10">
        <div className="flex items-center gap-2">
          {/* Logo */}
          <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          
          {/* Info */}
          <div>
            <p className="text-white font-bold text-sm leading-tight">{brandName}</p>
            {episodeNum && (
              <p className="text-gray-400 text-xs leading-tight">Episode {episodeNum}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};