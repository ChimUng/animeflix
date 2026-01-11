"use client"
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

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

    resetTimer();

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
      className={`absolute top-[5px] right-[5px] z-50 transition-opacity duration-500 ease-out ${
        showHeader ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ pointerEvents: 'none' }}
    >
      {/* ✅ GIỐNG JUSTANIME - INLINE STYLE */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: 'white',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}
      >
        {/* ✅ LOGO ICON - DÙNG FILE ICON */}
        <div style={{
          width: '32px',
          height: '32px',
          background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
        }}>
          <Image 
            src="/icon-192x192.png" 
            alt="Animeflix"
            width={20}
            height={20}
            style={{ objectFit: 'contain' }}
          />
        </div>
        
        {/* Text "Powered by" */}
        <span style={{ fontWeight: '500', opacity: 0.9 }}>
          Powered by
        </span>
        
        {/* ✅ BRAND NAME VỚI GRADIENT */}
        <span 
          className="bg-gradient-to-r from-red-500 to-white bg-clip-text text-transparent font-custom"
          style={{
            fontWeight: '700',
            letterSpacing: '0.5px'
          }}
        >
          {brandName}
        </span>

        {/* Episode number
        {episodeNum && (
          <span style={{ opacity: 0.7, fontSize: '13px' }}>
            • EP {episodeNum}
          </span>
        )} */}
      </div>
    </div>
  );
};