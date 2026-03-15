"use client";
import React, { useEffect, useState, FC } from "react";
import { getEpisodes, getSources } from '@/lib/getData';
import PlayerEpisodeList from "./PlayerEpisodeList";
import Player from "./VidstackPlayer/player";
import {  TextTrackInit } from "@vidstack/react";
import { toast } from "sonner";
import { useTitle, useNowPlaying, useDataInfo } from "../../lib/store";
import { useStore } from "zustand";
import { Session as NextAuthSession } from "next-auth";
import { AnimeItem, EpisodeInfo } from "@/lib/types";
import { Provider, Source } from "@/lib/getData";
import { checkEnvironment } from "@/lib/checkEnvironment"; 
import { Episode as EpisodeFromApi } from "@/lib/getData"; 
import { CustomIframePlayer } from "./VidstackPlayer/CustomIframePlayer";
import router from "next/router";
import { CircleLoader } from "./VidstackPlayer/CircleLoader";
import { VideoJsPlayer } from "./VidstackPlayer/VideoJsPlayer";

// Định nghĩa interface cho skiptimes
interface SkipTime {
  startTime: number;
  endTime: number;
  text: string;
}

// Định nghĩa interface cho groupedEp
interface GroupedEp {
  previousep: EpisodeInfo | undefined;
  currentep: EpisodeInfo | undefined;
  nextep: EpisodeInfo | undefined;
}

// Định nghĩa interface cho sourceData
// interface Source {
//   headers?: { [key: string]: string };
//   sources: { url: string; quality: string; isM3U8: boolean; isEmbed?: boolean; }[];
//   tracks?: { src: string; label: string; kind: string; default?: boolean }[];
//   download?: string;
//   intro?: {
//     start: number;
//     end: number;
//   };
//   outro?: {
//     start: number;
//     end: number;
//   };
// }

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

interface AniSkipInterval {
  startTime: number;
  endTime: number;
}

interface AniSkipResult {
  skipType: "op" | "ed";
  interval: AniSkipInterval;
}

interface AniSkipResponse {
  found: boolean;
  results: AniSkipResult[];
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

  // ✅ THÊM STATE ĐỂ XỬ LÝ FALLBACK
  const [hlsError, setHlsError] = useState(false);
  const [episodeMap, setEpisodeMap] = useState<Record<number, Record<string, string>>>({});


  // useEffect chính, điều khiển việc fetch tuần tự
  useEffect(() => {
    const fetchDataSequentially = async () => {
      setIsEpisodeListLoading(true);
      setIsPlayerLoading(true);
      setError(null);
      setHlsError(false); 
      setSkipTimes([]);
      
      // ✅ BƯỚC 1: LẤY VÀ XỬ LÝ DANH SÁCH TẬP PHIM TRONG KHỐI TRY...CATCH RIÊNG
      let providersResponse;
      try {
        providersResponse = await getEpisodes(id, data?.status, false);
        if (!providersResponse || providersResponse.length === 0) {
            throw new Error("Không tìm thấy danh sách tập phim.");
        }
        setAllProvidersData(providersResponse);
      } catch (error: unknown) {
        console.error("Lỗi khi fetch Episodes:", error);
        const errorMessage = (error as Error).message || "Lỗi tải danh sách tập phim.";
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

      // ✅ Xử lý skip times (ưu tiên Aniskip, fallback API nguồn)
      if (data?.idMal) {
        const episodeLength =
          sourceResponse?.outro?.end ||
          sourceResponse?.intro?.end ||
          1500; // fallback 25 phút nếu không có

        let skipFetched = false;
        try {
          const skipResponse = await fetch(
            `https://api.aniskip.com/v2/skip-times/${data.idMal}/${parseInt(epNum)}?types[]=op&types[]=ed&episodeLength=${episodeLength}`
          );
          if (skipResponse.ok) {
            const skipData: AniSkipResponse = await skipResponse.json();
            if (skipData?.found && skipData?.results?.length > 0) {
              const op = skipData.results.find((item) => item.skipType === "op");
              const ed = skipData.results.find((item) => item.skipType === "ed");
              const newSkipTimes: SkipTime[] = [];
              if (op?.interval) newSkipTimes.push({ startTime: op.interval.startTime, endTime: op.interval.endTime, text: "Opening" });
              if (ed?.interval) newSkipTimes.push({ startTime: ed.interval.startTime, endTime: ed.interval.endTime, text: "Ending" });
              setSkipTimes(newSkipTimes);
              skipFetched = true;
            }
          }
        } catch (err) {
          console.warn("⚠️ Lỗi gọi Aniskip:", err);
        }

        // ✅ Fallback nếu Aniskip không có hoặc lỗi
        if (!skipFetched) {
          console.log("📌 Fallback skip times từ API nguồn");
          const newSkipTimes: SkipTime[] = [];
          if (sourceResponse.intro) newSkipTimes.push({ startTime: sourceResponse.intro.start, endTime: sourceResponse.intro.end, text: "Opening" });
          if (sourceResponse.outro) newSkipTimes.push({ startTime: sourceResponse.outro.start, endTime: sourceResponse.outro.end, text: "Ending" });
          setSkipTimes(newSkipTimes);
        }
      }

      if (data) {
        useDataInfo.setState({ dataInfo: data });
      }
      useNowPlaying.setState({ nowPlaying: { epId, provider, epNum, subtype: subdub } });

    } catch (error: unknown) {
      console.error("Lỗi khi fetch Sources:", error);
      const errorMessage = (error as Error).message || "Lỗi tải nguồn video.";
      toast.error(errorMessage);
      setError(errorMessage);
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
        // --- LOGIC MỚI: XÂY DỰNG MAP ---
        const newEpisodeMap: Record<number, Record<string, string>> = {};

        allProvidersData.forEach(prov => {
          const providerId = prov.providerId;
          let episodes: EpisodeFromApi[] = [];

          if (Array.isArray(prov.episodes)) {
            episodes = prov.episodes;
          } else if (prov.episodes.sub && prov.episodes.sub.length > 0) {
            episodes = prov.episodes.sub;
          } else if (prov.episodes.dub) {
            episodes = prov.episodes.dub;
          }

          episodes.forEach(ep => {
            const epNumber = ep.number;
            const episodeId = ep.id || ep.episodeId;
            if (!episodeId) return;

            if (!newEpisodeMap[epNumber]) {
              newEpisodeMap[epNumber] = {};
            }
            newEpisodeMap[epNumber][providerId] = episodeId;
          });
        });
        setEpisodeMap(newEpisodeMap);
    }
  }, [allProvidersData, provider, epNum, subdub]);

  const primarySource = 
    sourceData?.sources?.find((i) => i.quality === "default" || i.quality === "auto" && !i.isEmbed) ||
    sourceData?.sources?.find((i) => i.quality === "1080p" && !i.isEmbed) ||
    sourceData?.sources?.find((i) => !i.isEmbed); // Ưu tiên nguồn HLS đầu tiên

  const embedFallbackSource = sourceData?.sources?.find(s => s.isEmbed);

  const isInitiallyEmbed =hlsError || !primarySource; // Nếu không có nguồn HLS nào, mặc định là embed
  const src = primarySource?.url || "";
  // ✅ HÀM XỬ LÝ KHI VIDSTACK GẶP LỖI
  const handleHlsError = () => {
    console.warn("🔥 Lỗi HLS, đang thử fallback sang iframe...");
    if (embedFallbackSource) {
      setHlsError(true);
    } else {
      toast.error("Nguồn HLS bị lỗi và không có nguồn dự phòng.");
    }
  };

  const referer = sourceData?.headers?.Referer || "";

   // ✅ SỬA LỖI Ở ĐÂY: Bọc URL phụ đề và thumbnail qua proxy /api/stream
  const subtitles: TextTrackInit[] =
    sourceData?.tracks
      ?.filter(track => track.lang !== 'Thumbnails' && track.url)
      ?.map((track) => ({
        src: `${checkEnvironment()}/api/stream?url=${encodeURIComponent(track.url)}&referer=${encodeURIComponent(referer)}`,
        label: track.lang,
        kind: 'subtitles',
        default: track.lang.toLowerCase().includes('vi'),
      })) || [];

  const thumbnails: { src: string }[] =
    sourceData?.tracks
      ?.filter(track => track.lang === 'Thumbnails' && track.url)
      ?.map((track) => ({
        src: `${checkEnvironment()}/api/stream?url=${encodeURIComponent(track.url)}&referer=${encodeURIComponent(referer)}`,
      })) || [];


  // Xử lý session để tương thích với player.tsx
  const adaptedSession: Session | undefined = session
    ? {
        user: session.user
          ? {
              name: session.user.name ?? undefined,
              token: (session.user).token ?? undefined,
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
              <CircleLoader size={80} />
            </div>
          ) : error ? (
            <div className="h-full w-full aspect-video rounded-[8px] flex items-center justify-center flex-col text-center border border-solid border-white border-opacity-10">
              <p className="mb-2 text-xl">(╯°□°)╯︵ ɹoɹɹƎ</p>
              <p>Không thể tải tập phim. Vui lòng thử lại sau.</p>
            </div>
          ) : (
            <div className="h-full w-full aspect-video overflow-hidden">
              {(isInitiallyEmbed || hlsError) && embedFallbackSource ? (
                <CustomIframePlayer
                  src={embedFallbackSource.url}
                  episodeId={epId}
                  episodeNum={parseInt(epNum)}
                  animeTitle={validData.title[animetitle] || validData.title.romaji || "Unknown"}
                  autoNext={true}
                  onAutoNext={() => {
                    if (groupedEp?.nextep) {
                      router.push(
                        `/anime/watch?id=${id}&host=${provider}&epid=${
                          groupedEp.nextep.id || groupedEp.nextep.episodeId
                        }&ep=${groupedEp.nextep.number}&type=${subdub}`
                      );
                    }
                  }}
                />
                ) : provider === 'animepahe' ? (
                <VideoJsPlayer
                  src={src}
                  onError={handleHlsError}
                />
            ) : (
              <Player
                dataInfo={validData || undefined}
                id={id}
                groupedEp={groupedEp}
                session={adaptedSession}
                savedep={savedep}
                src={src}
                subtitles={subtitles}
                thumbnails={thumbnails}
                skiptimes={skiptimes}
                onError={handleHlsError} 
              />
            )}
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
          episodeMap={episodeMap}
        />
      </div>
    </div>
  );
};

export default PlayerComponent;