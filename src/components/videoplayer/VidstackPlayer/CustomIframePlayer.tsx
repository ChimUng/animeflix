"use client"
import React, { useEffect, useState, useRef } from 'react';
import { CustomHeader } from './CustomHeader';

interface CustomIframePlayerProps {
  src: string;
  episodeId: string;
  episodeNum: number;
  animeTitle: string;
  autoNext?: boolean;
  onAutoNext?: () => void;
}

export const CustomIframePlayer: React.FC<CustomIframePlayerProps> = ({
  src,
  episodeId,
  episodeNum,
  animeTitle,
  autoNext = false,
  onAutoNext,
}) => {
  const [loading, setLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ===== LISTEN TO IFRAME MESSAGES (AUTO-NEXT) =====
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security check (optional)
      // if (event.origin !== 'https://your-domain.com') return;

      const { type, currentTime, duration } = event.data;

      if (type === 'timeupdate' && currentTime && duration) {
        // Auto-next when video ends
        if (autoNext && currentTime >= duration - 1) {
          console.log('📺 Video ended, triggering auto-next...');
          onAutoNext?.();
        }
      }

      if (type === 'videoLoaded') {
        setIframeLoaded(true);
        setTimeout(() => setLoading(false), 500);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [autoNext, onAutoNext]);

  // ===== KEYBOARD SHORTCUTS =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen();
      }
      
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (containerRef.current) {
          if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden rounded-lg"
    >
      {/* ===== CUSTOM HEADER (GIỐNG HLS PLAYER) ===== */}
      <CustomHeader
        brandName="Animeflix"
        episodeNum={episodeNum}
        autoHide={true}
        hideDelay={2000}
      />

      {/* ===== LOADING OVERLAY ===== */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 z-40 transition-opacity duration-500 ${
        loading ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="flex space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 bg-red-600 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-gray-500 text-xs mt-4">{animeTitle}</p>
      </div>

      {/* ===== IFRAME ===== */}
      <iframe
        ref={iframeRef}
        key={`${episodeId}-${src}`}
        src={src}
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture"
        className={`w-full h-full transition-opacity duration-700 ${
          iframeLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleIframeLoad}
        style={{
          border: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
};