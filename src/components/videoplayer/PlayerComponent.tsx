"use client";
import React, { useEffect, useState, FC } from "react";
import { getEpisodes, getSources } from '@/lib/getData';
import PlayerEpisodeList from "./PlayerEpisodeList";
import Player from "./VidstackPlayer/player";
import { Spinner, TextTrackInit } from "@vidstack/react";
import { toast } from "sonner";
import { useTitle, useNowPlaying, useDataInfo } from "../../lib/store";
import { useStore } from "zustand";
import { Session as NextAuthSession } from "next-auth";
import { AnimeItem, EpisodeInfo } from "@/lib/types";
import { Provider } from "@/lib/getData";

// Định nghĩa interface cho skiptimes
interface SkipTime {
  startTime: number;
  endTime: number;
  text: string;
}

// Định nghĩa interface cho episode trong nowPlaying
interface Episode {
  download: string | null;
  skiptimes: SkipTime[];
  epId: string | null;
  provider: string | null;
  epNum: string | number | null;
  subtype: string | null;
}

// Định nghĩa interface cho groupedEp
interface GroupedEp {
  previousep: EpisodeInfo | undefined;
  currentep: EpisodeInfo | undefined;
  nextep: EpisodeInfo | undefined;
}

// Định nghĩa interface cho sourceData
interface Source {
  headers?: { [key: string]: string };
  sources: { url: string; quality: string; isM3U8: boolean }[];
  tracks?: { src: string; label: string; kind: string; default?: boolean }[];
  download?: string;
}

// Định nghĩa interface cho savedep
interface SavedEpisode {
  timeWatched: number;
}

// Định nghĩa interface cho session (khớp với player.tsx)
interface Session {
  user?: {
    name?: string | undefined;
    token?: string | undefined;
  };
}

// Định nghĩa interface cho props của PlayerComponent
interface PlayerComponentProps {
  id: string;
  epId: string;
  provider: string;
  epNum: string;
  subdub: string;
  data: AnimeItem | null;
  session: NextAuthSession | null;
  savedep: SavedEpisode[];
}

const PlayerComponent: FC<PlayerComponentProps> = ({
  id,
  epId,
  provider,
  epNum,
  subdub,
  data,
  session,
  savedep,
}) => {
  const animetitle = useStore(useTitle, (state: { animetitle: string }) => state.animetitle);

  // State quản lý tập trung
  const [sourceData, setSourceData] = useState<Source | null>(null);
  const [allProvidersData, setAllProvidersData] = useState<Provider[] | null>(null);
  const [groupedEp, setGroupedEp] = useState<GroupedEp | null>(null);
  const [skiptimes, setSkipTimes] = useState<SkipTime[]>([]);

  // State loading và error riêng biệt
  const [isEpisodeListLoading, setIsEpisodeListLoading] = useState(true);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // useEffect chính, điều khiển việc fetch tuần tự
  useEffect(() => {
    const fetchDataSequentially = async () => {
      setIsEpisodeListLoading(true);
      setIsPlayerLoading(true);
      setError(null);
      setSkipTimes([]);
      
      // ✅ BƯỚC 1: LẤY VÀ XỬ LÝ DANH SÁCH TẬP PHIM TRONG KHỐI TRY...CATCH RIÊNG
      let providersResponse;
      try {
        providersResponse = await getEpisodes(id, data?.status, false);
        if (!providersResponse || providersResponse.length === 0) {
            throw new Error("Không tìm thấy danh sách tập phim.");
        }
        setAllProvidersData(providersResponse);
      } catch (err: any) {
        console.error("Lỗi khi fetch Episodes:", err);
        const errorMessage = err.message || "Lỗi tải danh sách tập phim.";
        toast.error(errorMessage);
        setError(errorMessage);
        setIsEpisodeListLoading(false);
        setIsPlayerLoading(false); // Dừng cả quá trình loading player
        return; // Thoát khỏi hàm ngay lập tức
      }
      setIsEpisodeListLoading(false);

         // ✅ BƯỚC 2: LẤY VÀ XỬ LÝ NGUỒN VIDEO TRONG KHỐI TRY...CATCH RIÊNG
      try {
        const sourceResponse = await getSources(id, provider, epId, parseInt(epNum), subdub);
        if (!sourceResponse?.sources || sourceResponse.sources.length === 0) {
          throw new Error("Không thể tải nguồn video cho tập này.");
        }
        setSourceData(sourceResponse);

        if (data?.idMal) {
          const skipResponse = await fetch(`https://api.aniskip.com/v2/skip-times/${data.idMal}/${parseInt(epNum)}?types[]=op&types[]=ed`);
          if (skipResponse.ok) {
            const skipData = await skipResponse.json();
            const op = skipData?.results?.find((item: any) => item.skipType === "op");
            const ed = skipData?.results?.find((item: any) => item.skipType === "ed");
            const newSkipTimes: SkipTime[] = [];
            if (op?.interval) newSkipTimes.push({ startTime: op.interval.startTime, endTime: op.interval.endTime, text: "Opening" });
            if (ed?.interval) newSkipTimes.push({ startTime: ed.interval.startTime, endTime: ed.interval.endTime, text: "Ending" });
            setSkipTimes(newSkipTimes);
          }
        }
        
        if (data) { // ✅ Chỉ cập nhật store nếu `data` không phải là `null`
            useDataInfo.setState({ dataInfo: data });
        }
        useNowPlaying.setState({ nowPlaying: { epId, provider, epNum, subtype: subdub } });

      } catch (err: any) {
        console.error("Lỗi khi fetch Sources:", err);
        const errorMessage = err.message || "Lỗi tải nguồn video.";
        toast.error(errorMessage); // Chỉ thông báo lỗi của bước này
        setError(errorMessage); // Set lỗi để hiển thị ở khu vực player
      } finally {
        setIsPlayerLoading(false);
      }
    };

    fetchDataSequentially();
  }, [id, provider, epId, epNum, subdub, data]);

  // useEffect tính toán tập trước/sau
  useEffect(() => {
    if (allProvidersData && provider && epNum) {
        const currentProviderData = allProvidersData.find(p => p.providerId === provider);
        if (currentProviderData) {
            let episodes: EpisodeInfo[] = [];
            if (currentProviderData.consumet) {
                const episodesObj = currentProviderData.episodes as { sub?: EpisodeInfo[]; dub?: EpisodeInfo[] };
                episodes = subdub === 'sub' ? episodesObj.sub ?? [] : episodesObj.dub ?? [];
            } else {
                episodes = currentProviderData.episodes as EpisodeInfo[];
            }
            
            const epNumInt = parseInt(epNum);
            setGroupedEp({
                previousep: episodes.find(e => e.number === epNumInt - 1),
                currentep: episodes.find(e => e.number === epNumInt),
                nextep: episodes.find(e => e.number === epNumInt + 1),
            });
        }
    }
  }, [allProvidersData, provider, epNum, subdub]);

  const src =
    sourceData?.sources?.find((i) => i.quality === "default" || i.quality === "auto")?.url ||
    sourceData?.sources?.find((i) => i.quality === "1080p")?.url ||
    sourceData?.sources?.[0]?.url ||
    "";

  const subtitles: TextTrackInit[] =
    sourceData?.tracks
      ?.filter((t) => t.kind === "subtitles" && t.src)
      .map((t) => ({
        src: t.src!,
        label: t.label,
        kind: t.kind as TextTrackInit["kind"],
        default: t.default,
      })) || [];

  const thumbnails: { src: string }[] =
    sourceData?.tracks
      ?.filter((t) => t.kind === "thumbnails" && t.src)
      .map((t) => ({
        src: t.src!,
      })) || [];

  // Xử lý session để tương thích với player.tsx
  const adaptedSession: Session | undefined = session
    ? {
        user: session.user
          ? {
              name: session.user.name ?? undefined,
              token: (session.user as any).token ?? undefined,
            }
          : undefined,
      }
    : undefined;

  // Xử lý data để tránh null
  const validData: AnimeItem = data || {
    id: "",
    title: { romaji: "Unknown Title" },
    idMal: null,
  };

  return (
    <div className="xl:w-[99%]">
      <div>
        <div className="mb-2">
          {isPlayerLoading ? (
            <div className="h-full w-full rounded-[8px] flex items-center justify-center aspect-video border border-solid border-white border-opacity-10">
              <Spinner.Root className="text-white animate-spin opacity-100" size={84}>
                <Spinner.Track className="opacity-25" width={8} />
                <Spinner.TrackFill className="opacity-75" width={8} />
              </Spinner.Root>
            </div>
          ) : error ? (
            <div className="h-full w-full aspect-video rounded-[8px] flex items-center justify-center flex-col text-center border border-solid border-white border-opacity-10">
              <p className="mb-2 text-xl">(╯°□°)╯︵ ɹoɹɹƎ</p>
              <p>Không thể tải tập phim. Vui lòng thử lại sau.</p>
            </div>
          ) : (
            <div className="h-full w-full aspect-video overflow-hidden">
              <Player
                dataInfo={validData || undefined}
                id={id}
                groupedEp={groupedEp}
                session={session as Session | undefined}
                savedep={savedep}
                src={src}
                subtitles={subtitles}
                thumbnails={thumbnails}
                skiptimes={skiptimes}
              />
            </div>
          )}
        </div>
        <div className="my-2 mx-2 sm:mx-1 px-1 lg:px-0">
          <h2 className="text-xl">{validData.title[animetitle] || validData.title.romaji}</h2>
          <h2 className="text-base text-[#ffffffb2]">{`TẬP ${epNum}`}</h2>
        </div>
      </div>
      <div className="w-[98%] mx-auto lg:w-full">
        <PlayerEpisodeList
          isLoading={isEpisodeListLoading}
          id={id}
          data={validData}
          onprovider={provider}
          epnum={parseInt(epNum)}
          allProvidersData={allProvidersData}
        />
      </div>
    </div>
  );
};

export default PlayerComponent;