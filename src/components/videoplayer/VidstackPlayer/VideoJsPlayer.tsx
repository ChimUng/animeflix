"use client";
import React, { useEffect, useRef } from "react";

interface VideoJsPlayerProps {
  src: string;
  onError?: () => void;
}

export const VideoJsPlayer: React.FC<VideoJsPlayerProps> = ({ src, onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Load Video.js từ CDN nếu chưa có
    const loadVideoJs = async () => {
      // Thêm CSS nếu chưa có
      if (!document.querySelector('link[href*="video-js"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://vjs.zencdn.net/8.10.0/video-js.css";
        document.head.appendChild(link);
      }

      // Load Video.js script
      if (!(window as unknown as { videojs?: unknown }).videojs) {
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "https://vjs.zencdn.net/8.10.0/video.min.js";
          script.onload = () => resolve();
          document.head.appendChild(script);
        });

        // Load HLS plugin
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/@videojs/http-streaming@3.10.0/dist/videojs-http-streaming.min.js";
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      // Tạo video element
      if (!containerRef.current) return;
      containerRef.current.innerHTML = "";

      const video = document.createElement("video");
      video.id = `videojs-${Date.now()}`;
      video.className = "video-js vjs-default-skin vjs-big-play-centered";
      video.controls = true;
      video.style.width = "100%";
      video.style.height = "100%";
      containerRef.current.appendChild(video);

      // Khởi tạo Video.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const videojs = (window as any).videojs;
      if (!videojs) return;

      const player = videojs(video, {
        fluid: true,
        aspectRatio: "16:9",
        html5: {
          vhs: {
            overrideNative: true,
            withCredentials: true,
            useBandwidthFromLocalStorage: false,
            smoothQualityChange: true,
            allowSeeksWithinUnsafeLiveWindow: true,
          },
          nativeAudioTracks: false,
          nativeVideoTracks: false,
        },
        controls: true,
        autoplay: false,
        preload: "auto",
      });

      player.src({
        src: src,
        type: "application/x-mpegURL",
        withCredentials: true,
      });

      player.on("error", () => {
        console.error("Video.js error:", player.error());
        onError?.();
      });

      playerRef.current = player;
    };

    loadVideoJs();

    return () => {
      // Cleanup
      if (playerRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (playerRef.current as any).dispose?.();
        playerRef.current = null;
      }
    };
  }, [src]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black"
      style={{ aspectRatio: "16/9" }}
    />
  );
};