import buttonStyles from "../styles/button.module.css";
import tooltipStyles from "../styles/tooltip.module.css";
import { useNowPlaying, useDataInfo } from "@/lib/store";
import { useStore } from "zustand";
import {
  CaptionButton,
  FullscreenButton,
  isTrackCaptionKind,
  MuteButton,
  PIPButton,
  PlayButton,
  Tooltip,
  useMediaState,
  type TooltipPlacement,
  useMediaRemote,
  useMediaStore,
  SeekButton,
  GoogleCastButton,
  AirPlayButton,
} from "@vidstack/react";
import { useRouter } from "next-nprogress-bar";
import {
  FaPlay,
  FaPause,
  FaVolumeUp,
  FaVolumeMute,
  FaClosedCaptioning,
  FaExpand,
  FaCompress,
  FaImage,
  FaForward,
  FaBackward,
  FaChromecast,
} from "react-icons/fa";
import { IoAirplane, IoPlaySkipBack, IoPlaySkipForward } from "react-icons/io5"; // Nhập IoAirplay từ react-icons/io5
import { RiReplay10Fill as ReplayIcon, RiPictureInPicture2Fill } from "react-icons/ri";
import { GrBackTen, GrForwardTen } from "react-icons/gr";

export interface MediaButtonProps {
  tooltipPlacement: TooltipPlacement;
  offset?: number | undefined;
  groupedEp?: any;
  host?: boolean;
}

export function Play({ tooltipPlacement, offset }: MediaButtonProps) {
  const isPaused = useMediaState("paused"),
    ended = useMediaState("ended"),
    Icon = ended ? ReplayIcon : isPaused ? FaPlay : FaPause;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <PlayButton className={`play-button ${buttonStyles.button}`}>
          <Icon className="w-8 h-8" />
        </PlayButton>
      </Tooltip.Trigger>
      <Tooltip.Content
        className={`${tooltipStyles.tooltip} parent-data-[open]:hidden`}
        placement={tooltipPlacement}
        offset={offset}
      >
        {isPaused ? "Phát" : "Ngưng"}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

export function SeekForwardButton({ tooltipPlacement, offset }: MediaButtonProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <SeekButton seconds={10} className={`play-button ${buttonStyles.button}`}>
          <GrForwardTen className="w-8 h-8" />
        </SeekButton>
      </Tooltip.Trigger>
      <Tooltip.Content
        offset={offset}
        className={`${tooltipStyles.tooltip} parent-data-[open]:hidden`}
        placement={tooltipPlacement}
      >
        Tua 10s
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

export function SeekBackwardButton({ tooltipPlacement, offset }: MediaButtonProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <SeekButton seconds={-10} className={`play-button ${buttonStyles.button}`}>
          <GrBackTen className="w-8 h-8" />
        </SeekButton>
      </Tooltip.Trigger>
      <Tooltip.Content
        offset={offset}
        className={`${tooltipStyles.tooltip} parent-data-[open]:hidden`}
        placement={tooltipPlacement}
      >
        Tua 10s
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

export function NextEpisode({ tooltipPlacement, offset, groupedEp }: MediaButtonProps) {
  const router = useRouter();
  const nowPlaying = useStore(useNowPlaying, (state) => state.nowPlaying);
  const dataInfo = useStore(useDataInfo, (state) => state.dataInfo);
  function handleNext() {
    router.push(
      `/anime/watch?id=${dataInfo?.id}&host=${nowPlaying?.provider}&epid=${groupedEp?.nextep?.id || groupedEp?.nextep?.episodeId}&ep=${groupedEp?.nextep?.number}&type=${nowPlaying?.subtype}`
    );
  }

  return (
    groupedEp?.nextep && (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div
            onClick={handleNext}
            onTouchEnd={handleNext}
            className={`play-button ${buttonStyles.button}`}
          >
            <IoPlaySkipForward className="w-7 h-7" />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content
          offset={offset}
          className={`${tooltipStyles.tooltip} parent-data-[open]:hidden`}
          placement={tooltipPlacement}
        >
          Tập tiếp theo
        </Tooltip.Content>
      </Tooltip.Root>
    )
  );
}

export function PreviousEpisode({ tooltipPlacement, offset, groupedEp }: MediaButtonProps) {
  const router = useRouter();
  const nowPlaying = useStore(useNowPlaying, (state) => state.nowPlaying);
  const dataInfo = useStore(useDataInfo, (state) => state.dataInfo);
  function handlePrev() {
    router.push(
      `/anime/watch?id=${dataInfo?.id}&host=${nowPlaying?.provider}&epid=${groupedEp?.previousep?.id || groupedEp?.previousep?.episodeId}&ep=${groupedEp?.previousep?.number}&type=${nowPlaying?.subtype}`
    );
  }

  return (
    groupedEp?.previousep && (
      <Tooltip.Root>
        <Tooltip.Trigger>
          <div
            onClick={handlePrev}
            onTouchEnd={handlePrev}
            className={`play-button mt-[0px] ${buttonStyles.button}`}
          >
            <IoPlaySkipBack className="w-7 h-7" />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content
          offset={offset}
          className={`${tooltipStyles.tooltip} parent-data-[open]:hidden`}
          placement={tooltipPlacement}
        >
          Tập trước
        </Tooltip.Content>
      </Tooltip.Root>
    )
  );
}

export function DesktopPlayButton({ tooltipPlacement }: MediaButtonProps) {
  const isPaused = useMediaState("paused"),
    ended = useMediaState("ended"),
    Icon = ended ? ReplayIcon : isPaused ? FaPlay : FaPause;
  return (
    <PlayButton
      className={`group ring-media-focus relative inline-flex h-20 w-20 media-paused:cursor-pointer cursor-default items-center justify-center rounded-full outline-none border-2 border-white/70`}
    >
      <Icon className="w-12 h-12 text-[#d14836] relative left-[3px]" />
    </PlayButton>
  );
}

export function MobilePlayButton({ tooltipPlacement }: MediaButtonProps) {
  const isPaused = useMediaState("paused"),
    ended = useMediaState("ended"),
    Icon = ended ? ReplayIcon : isPaused ? FaPlay : FaPause;
  return (
    <PlayButton
      className={`group ring-media-focus relative inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full outline-none border-1 border-white/70`}
    >
      <Icon className="w-8 h-8 text-[#d14836] relative left-[2px]" />
    </PlayButton>
  );
}

export function Mute({ tooltipPlacement, offset }: MediaButtonProps) {
  const volume = useMediaState("volume"),
    isMuted = useMediaState("muted");
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <MuteButton className={`play-button ${buttonStyles.button}`}>
          {isMuted || volume == 0 ? (
            <FaVolumeMute className="w-8 h-8" />
          ) : volume < 0.5 ? (
            <FaVolumeUp className="w-8 h-8" />
          ) : (
            <FaVolumeUp className="w-8 h-8" />
          )}
        </MuteButton>
      </Tooltip.Trigger>
      <Tooltip.Content
        offset={offset}
        className={`${tooltipStyles.tooltip} parent-data-[open]:hidden`}
        placement={tooltipPlacement}
      >
        {isMuted ? "Unmute" : "Mute"}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

export function Caption({ tooltipPlacement, offset }: MediaButtonProps) {
  const track = useMediaState("textTrack"),
    isOn = track && isTrackCaptionKind(track);
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <CaptionButton className={`play-button ${buttonStyles.button}`}>
          <FaClosedCaptioning
            className={`w-8 h-8 transition-colors ${
              isOn ? "text-[#d14836]" : "text-white hover:text-[#d14836]"
            }`}
          />
        </CaptionButton>
      </Tooltip.Trigger>
      <Tooltip.Content
        offset={offset}
        className={`${tooltipStyles.tooltip} parent-data-[open]:hidden`}
        placement={tooltipPlacement}
      >
        {isOn ? "Đóng phụ đề" : "Mở phụ đề"}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

export function PIP({ tooltipPlacement, offset }: MediaButtonProps) {
  const isActive = useMediaState("pictureInPicture");
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <PIPButton className={`play-button ${buttonStyles.button}`}>
          <RiPictureInPicture2Fill className="w-8 h-8" />
        </PIPButton>
      </Tooltip.Trigger>
      <Tooltip.Content
        offset={offset}
        className={`${tooltipStyles.tooltip} parent-data-[open]:hidden`}
        placement={tooltipPlacement}
      >
        {isActive ? "Thoát PIP" : "Mở PIP"}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

export function PlayNextButton({ tooltipPlacement, groupedEp }: MediaButtonProps) {
  const router = useRouter();
  const nowPlaying = useStore(useNowPlaying, (state) => state.nowPlaying);
  const dataInfo = useStore(useDataInfo, (state) => state.dataInfo);
  return (
    <button
      type="button"
      onClick={() => {
        if (groupedEp?.nextep) {
          router.push(
            `/anime/watch?id=${dataInfo?.id}&host=${nowPlaying?.provider}&epid=${groupedEp?.nextep?.id || groupedEp?.nextep?.episodeId}&ep=${groupedEp?.nextep?.number}&type=${nowPlaying?.subtype}`
          );
        }
      }}
      className="nextbtn hidden absolute bottom-[70px] sm:bottom-[83px] text-[15px] right-4 z-[40] bg-[d14836] text-black py-2 px-3 rounded-[4px] font-medium"
    >
      Chuyển tập
    </button>
  );
}

export function Fullscreen({ tooltipPlacement, offset }: MediaButtonProps) {
  const isActive = useMediaState("fullscreen");
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <FullscreenButton className={`play-button ${buttonStyles.button}`}>
          {isActive ? <FaCompress className="w-8 h-8" /> : <FaExpand className="w-8 h-8" />}
        </FullscreenButton>
      </Tooltip.Trigger>
      <Tooltip.Content
        offset={offset}
        className={`${tooltipStyles.tooltip} parent-data-[open]:hidden`}
        placement={tooltipPlacement}
      >
        {isActive ? "Thoát chế độ" : "Toàn màn hình"}
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

export function ChromeCast({ tooltipPlacement, offset }: MediaButtonProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <GoogleCastButton className={`play-button ${buttonStyles.button}`}>
          <FaChromecast className="w-8 h-8" />
        </GoogleCastButton>
      </Tooltip.Trigger>
      <Tooltip.Content
        offset={offset}
        className={`${tooltipStyles.tooltip} parent-data-[open]:hidden`}
        placement={tooltipPlacement}
      >
        Chromecast
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

export function AirPlay({ tooltipPlacement, offset }: MediaButtonProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <AirPlayButton className="media-button">
          <IoAirplane className="w-8 h-8" />
        </AirPlayButton>
      </Tooltip.Trigger>
      <Tooltip.Content
        offset={offset}
        className={`${tooltipStyles.tooltip} parent-data-[open]:hidden`}
        placement={tooltipPlacement}
      >
        Airplay
      </Tooltip.Content>
    </Tooltip.Root>
  );
}