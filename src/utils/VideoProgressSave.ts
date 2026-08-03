import { useState, useEffect } from "react";

export interface VideoProgressData {
  aniId: string;
  aniTitle?: string;
  epTitle?: string;
  image?: string;
  epId: string;
  epNum: number;
  timeWatched: number;
  duration: number;
  provider?: string;
  nextepId?: string | null;
  nextepNum?: number | null;
  subtype?: string;
  createdAt?: string;
}

type VideoSettings = Record<string, VideoProgressData>;

type VideoProgressHook = [
  (id: string) => VideoProgressData | undefined,
  (id: string, data: VideoProgressData) => void,
  (id: string) => void,
  () => VideoProgressData[]
];

function VideoProgressSave(): VideoProgressHook {
  const [settings, setSettings] = useState<VideoSettings>(() => {
    if (typeof window === "undefined") {
      return {};
    }

    try {
      const storedSettings = localStorage.getItem("vidstack_settings");
      return storedSettings ? JSON.parse(storedSettings) : {};
    } catch (error) {
      console.error("Failed to parse settings from localStorage", error);
      return {};
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("vidstack_settings", JSON.stringify(settings));
      } catch (error) {
        console.error("Failed to save settings to localStorage", error);
      }
    }
  }, [settings]);

  const getVideoProgress = (id: string): VideoProgressData | undefined => {
    return settings[id];
  };

  const UpdateVideoProgress = (id: string, data: VideoProgressData): void => {
    setSettings(prevSettings => ({
      ...prevSettings,
      [id]: data,
    }));
  };

  const removeVideoProgress = (id: string): void => {
    setSettings(prevSettings => {
      const updated = { ...prevSettings };
      delete updated[id];
      return updated;
    });
  };

  const getAllVideoProgress = (): VideoProgressData[] => {
    return Object.values(settings);
  };

  return [getVideoProgress, UpdateVideoProgress, removeVideoProgress, getAllVideoProgress];
}

export default VideoProgressSave;