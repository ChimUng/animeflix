"use client"
import React, { useEffect, useRef, useState } from "react";
import "@vidstack/react/player/styles/base.css";
import "@vidstack/react/player/styles/default/keyboard.css";
import styles from "./player.module.css";
import {
  MediaPlayer,
  MediaProvider,
  useMediaStore,
  useMediaRemote,
  Track,
  TextTrack,
  MediaPlayerInstance, // Correct type for the ref
  TextTrackInit,
  MediaLoadingStrategy, // Import type for subtitles
  // MediaErrorEvent,
} from "@vidstack/react";
import { DefaultKeyboardDisplay } from '@vidstack/react/player/layouts/default';
// import { FastForwardIcon, FastBackwardIcon } from '@vidstack/react/icons';

import { useRouter } from "next/navigation";    
import { useStore } from "zustand";
import { toast } from 'sonner';

import VideoProgressSave from '@/utils/VideoProgressSave';
import { VideoLayout } from "./components/layouts/video-layout";
import { updateEp } from "@/lib/EpHistoryfunctions";
import { saveProgress } from "@/lib/AnilistUser";
import { useSettings, useTitle, useNowPlaying } from '@/lib/store';
import { AnimeItem, GroupedEpisodes } from '@/lib/types';
import { CustomHeader } from "./CustomHeader";



// Type for session object
interface Session {
  user?: {
    name?: string;
    token?: string;
  };
}

// Type for saved episode progress
interface SavedEpisode {
  timeWatched: number;
}

// Type for skip times (OP/ED)
interface SkipTime {
  startTime: number;
  endTime: number;
  text: string;
}

// Main props interface for the Player component
interface PlayerProps {
  dataInfo?: AnimeItem | null; // Cho phép null
  id: string | number;
  groupedEp?: GroupedEpisodes | null; // Cập nhật sau ở lỗi
  src: string;
  session?: Session;
  savedep?: SavedEpisode[];
  subtitles?: TextTrackInit[]; // Use the imported type from Vidstack
  thumbnails?: { src: string }[];
  skiptimes?: SkipTime[];
  onError?: () => void; // Callback for error handling
}

// --- Component ---

const Player: React.FC<PlayerProps> = ({
  dataInfo,
  id,
  groupedEp,
  src,
  session,
  savedep,
  subtitles,
  thumbnails,
  skiptimes,
  onError
}) => {
  const settings = useStore(useSettings, (state) => state.settings);
  const animetitle = useStore(useTitle, (state) => state.animetitle);
  const nowPlaying = useStore(useNowPlaying, (state) => state.nowPlaying);
  const { epId, provider, epNum, subtype } = nowPlaying;
  const { currentep, nextep } = groupedEp || {};
  const [getVideoProgress, UpdateVideoProgress] = VideoProgressSave();
  const router = useRouter();

  // Strongly type the ref with the element type from Vidstack
  const playerRef = useRef<MediaPlayerInstance>(null);
  const { duration } = useMediaStore(playerRef);
  const remote = useMediaRemote(playerRef);

  const [opbutton, setopbutton] = useState<boolean>(false);
  const [edbutton, setedbutton] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progressSaved, setprogressSaved] = useState<boolean>(false);
  
  // Type the interval variable
  let interval: NodeJS.Timeout;

  useEffect(() => {
    // The parameters (currentTime, duration) are automatically typed by Vidstack's subscribe method
    const unsubscribe = playerRef.current?.subscribe(({ currentTime }: { currentTime: number; duration: number }) => {
      if (skiptimes && skiptimes.length > 0) {
        const op = skiptimes.find(s => s.text === "Opening");
        const ed = skiptimes.find(s => s.text === "Ending");

        if (op) {
          const inOpening = currentTime > op.startTime && currentTime < op.endTime;
          setopbutton(inOpening);
          if (settings?.autoskip && inOpening) {
            remote.seek(op.endTime);
          }
        }
        
        if (ed) {
          const inEnding = currentTime > ed.startTime && currentTime < ed.endTime;
          setedbutton(inEnding);
          if (settings?.autoskip && inEnding) {
            remote.seek(ed.endTime);
          }
        }
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [settings, skiptimes, remote]);

  function onCanPlay() {
    if (skiptimes && skiptimes.length > 0 && playerRef.current) {
      const track = new TextTrack({
        kind: 'chapters',
        default: true,
        label: 'English',
        language: 'en-US',
        type: 'json'
      });
      // Ensure window.VTTCue is available before using it
      if (typeof window !== "undefined" && window.VTTCue) {
          for (const cue of skiptimes) {
              track.addCue(new window.VTTCue(cue.startTime, cue.endTime, cue.text));
          }
          playerRef.current.textTracks.add(track);
      }
    }
  }

  function onEnd() {
    setIsPlaying(false);
  }

  function onEnded() {
    if (!nextep?.id && !nextep?.episodeId) return;
    if (settings?.autonext) {
      router.push(
        `/anime/watch?id=${dataInfo?.id}&host=${provider}&epid=${nextep?.id || nextep?.episodeId}&ep=${nextep?.number}&type=${subtype}`
      );
    }
  }

  function onPlay() {
    setIsPlaying(true);
  }

  function onPause() {
    setIsPlaying(false);
  }

 useEffect(() => {
    if (isPlaying) {
      interval = setInterval(async () => {
        const currentTime = playerRef.current?.currentTime
          ? Math.round(playerRef.current?.currentTime)
          : 0;

        await updateEp({
          userName: session?.user?.name,
          aniId: String(dataInfo?.id) || String(id),
          aniTitle: dataInfo?.title?.[animetitle] || dataInfo?.title?.romaji,
          epTitle: currentep?.title || `EP ${epNum}`,
          image: currentep?.img || currentep?.image ||
            dataInfo?.bannerImage || dataInfo?.coverImage?.extraLarge || '',
          epId: epId,
          epNum: Number(epNum) || Number(currentep?.number),
          timeWatched: currentTime,
          duration: duration,
          provider: provider,
          nextepId: nextep?.id || null,
          nextepNum: nextep?.number || null,
          subtype: subtype
        })

        UpdateVideoProgress(String(dataInfo?.id ?? id), {
          aniId: String(dataInfo?.id) || String(id),
          aniTitle: dataInfo?.title?.[animetitle] ?? dataInfo?.title?.romaji ?? undefined,
          epTitle: currentep?.title || `EP ${epNum}`,
          image: currentep?.img || currentep?.image ||
            dataInfo?.bannerImage || dataInfo?.coverImage?.extraLarge || '',
          epId: epId,
          epNum: Number(epNum) || Number(currentep?.number),
          timeWatched: currentTime,
          duration: duration,
          provider: provider,
          nextepId: nextep?.id || nextep?.episodeId || null,
          nextepNum: nextep?.number || null,
          subtype: subtype,
          createdAt: new Date().toISOString(),
        });
      }, 5000);
    } else {
      clearInterval(interval);
    }

    return () => {
      clearInterval(interval);
    };
  }, [isPlaying, duration]);

  function onLoadedMetadata() {
    if (savedep && savedep[0]?.timeWatched) {
        remote.seek(savedep[0].timeWatched - 3);
    } else {
      const seek = getVideoProgress(String(dataInfo?.id ?? id));
      if (seek?.epNum === Number(epNum)) {
        const seekTime = seek?.timeWatched;
        const percentage = duration !== 0 ? seekTime / Math.round(duration) : 0;

        if (percentage < 0.95) {
          remote.seek(seekTime - 3);
        }
      }
    }
  }

  function onTimeUpdate(event: { currentTime: number; }) {
    const { currentTime } = event;
    const percentage = currentTime / duration;

    if (session?.user?.token && !progressSaved && percentage >= 0.9) {
    try {
      const animeId = Number(dataInfo?.id ?? id);
      if (isNaN(animeId)) {
        throw new Error("Invalid anime ID");
      }
      const episodeNumber = Number(epNum) || Number(currentep?.number) || 0;
      if (episodeNumber === 0) {
        console.warn("Episode number is 0, which may be invalid.");
      }
      setprogressSaved(true);
      saveProgress(session.user.token, animeId, episodeNumber);
    } catch (error) {
      console.error("Error saving progress:", error);
      toast.error("Error saving progress due to high traffic.");
    }
  }

    const timeToShowButton = duration - 8;
    const nextButton = document.querySelector<HTMLButtonElement>(".nextbtn");
    if (nextButton) {
      const shouldShow = duration > 0 && currentTime > timeToShowButton && (!!nextep?.id || !!nextep?.episodeId);
      nextButton.classList.toggle("hidden", !shouldShow);
    }
  }
  
  function onSourceChange() {
    // Reset state for the new source
    setprogressSaved(false);
  }

  function handleop() {
    const op = skiptimes?.find(s => s.text === "Opening");
    if (op) {
      remote.seek(op.endTime);
    }
  }

  function handleed() {
    const ed = skiptimes?.find(s => s.text === "Ending");
    if (ed) {
      remote.seek(ed.endTime);
    }
  }

  return (
    <MediaPlayer
      key={src}
      ref={playerRef}
      playsInline
      aspectRatio="16/9"
      load={settings?.load as MediaLoadingStrategy | undefined ?? 'idle'}
      muted={settings?.audio || false}
      autoPlay={settings?.autoplay || false}
      title={currentep?.title || `EP ${epNum}` || 'Loading...'}
      className={`${styles.player} player relative`}
      crossOrigin="anonymous"
      streamType="on-demand"
      onEnd={onEnd}
      onEnded={onEnded}
      onCanPlay={onCanPlay}
      src={{
        src: src,
        type: "application/x-mpegurl",
      }}
      onPlay={onPlay}
      onPause={onPause}
      onLoadedMetadata={onLoadedMetadata}
      onTimeUpdate={onTimeUpdate}
      onSourceChange={onSourceChange}
      onError={onError}
    >
      <MediaProvider>
        {subtitles?.map((track) => (
          <Track {...track} key={track.src} />
        ))}
      </MediaProvider>
      <CustomHeader
        brandName="Animeflix"
        episodeNum={Number(epNum)}
        autoHide={true}
        hideDelay={2000}
      />
      {opbutton && <button onClick={handleop} className='absolute bottom-[70px] sm:bottom-[83px] right-4 z-[40] bg-white text-black py-2 px-3 rounded-[6px] font-medium text-[15px]'>Skip Opening</button>}
      {edbutton && <button onClick={handleed} className='absolute bottom-[70px] sm:bottom-[83px] right-4 z-[40] bg-white text-black py-2 px-3 rounded-[6px] font-medium text-[15px]'>Skip Ending</button>}
      <VideoLayout
        subtitles={subtitles}
        thumbnails={thumbnails?.[0]?.src ? process.env.NEXT_PUBLIC_PROXY_URI + '/' + thumbnails[0].src : ""}
        groupedEp={groupedEp}
      />
      <DefaultKeyboardDisplay
        icons={{
          Play: undefined,
          Pause: undefined,
          Mute: undefined,
          VolumeUp: undefined,
          VolumeDown: undefined,
          EnterFullscreen: undefined,
          ExitFullscreen: undefined,
          EnterPiP: undefined,
          ExitPiP: undefined,
          CaptionsOn: undefined,
          CaptionsOff: undefined,
          SeekForward: undefined,
          SeekBackward: undefined,
        }}
      />
    </MediaPlayer>
  );
};

export default Player;