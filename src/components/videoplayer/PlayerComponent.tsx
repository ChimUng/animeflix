"use client";
import React, { useEffect, useState, useCallback, FC } from "react";
import { useRouter } from "next-nprogress-bar";
import { getEpisodes, getSources, getServers } from "@/lib/getData";
import PlayerEpisodeList from "./PlayerEpisodeList";
import ServerSelector from "./ServerSelector";
import Player from "./VidstackPlayer/player";
import { TextTrackInit } from "@vidstack/react";
import { toast } from "sonner";
import { useTitle, useNowPlaying, useDataInfo, useSettings } from "@/lib/store";
import { useStore } from "zustand";
import { checkEnvironment } from "@/lib/checkEnvironment";
import { CustomIframePlayer } from "./VidstackPlayer/CustomIframePlayer";
import { CircleLoader } from "./VidstackPlayer/CircleLoader";
import { buildWatchUrl } from "@/utils/watchUrl";
import type { AnimeItem } from "@/types/anime";
import type { Episode, Provider, VideoData } from "@/types/episode";
import type { AniSkipResponse, GroupedEp, PlayerComponentProps, ServerOption, SkipTime, } from "@/types/stream";

// ✅ MỚI — state cục bộ cho "tập đang phát", tách khỏi props (id/epId/provider/epNum/subdub
// đến từ URL server-render lần đầu).
//
// ⚠️ TẠI SAO KHÔNG DÙNG window.history.pushState/replaceState VỚI PATHNAME KHI ĐỔI TẬP/SERVER:
// Route hiện tại là catch-all động /anime/watch/[...watchid], nghĩa là provider/epId/epNum/
// subdub nằm ở PATH SEGMENT chứ không phải query string. Next.js App Router (và
// next-nprogress-bar — thư viện đang patch history API để hiện thanh loading) LUÔN theo dõi
// mọi lần gọi pushState/replaceState; hễ PATHNAME đổi, nó sẽ coi đó là một điều hướng thật
// và cố khớp lại route. Route Cache của Next cho segment động mặc định chỉ giữ ~30s, nên
// tuỳ thời điểm bấm mà cache còn hạn hay không -> gây reload chập chờn không thể đoán trước.
//
// ✅ QUYẾT ĐỊNH CUỐI (theo yêu cầu): chỉ có 2 loại thay đổi:
//   1) Đổi PROVIDER (vd anineko -> animehay): CHẤP NHẬN điều hướng thật bằng router.push.
//      allProvidersData/servers đã có cache (Redis + Next fetch cache) nên chi phí load lại
//      không lớn, và URL path phản ánh đúng provider mới (đúng cho SSR/metadata/watch-history
//      lần đầu, không còn lệch giữa path và state thật như cách dùng hash cho mọi trường hợp).
//   2) Cùng provider, chỉ đổi TẬP / SUB-DUB / SERVER: KHÔNG điều hướng thật — chỉ cập nhật
//      state cục bộ (activeEpisode) + ghi HASH (không phải pathname) để giữ khả năng deep-link
//      trong phiên hiện tại. Hash không bao giờ gửi lên server và Next không match route theo
//      hash -> không kích hoạt bất kỳ điều hướng/fetch nào của Next.
interface ActiveEpisode {
  epId: string;
  provider: string;
  epNum: string;
  subdub: string;
}

const HASH_SEP = "/";

function buildEpisodeHash(provider: string, epId: string, epNum: string, subdub: string): string {
  return `#${[provider, epId, epNum, subdub].map(encodeURIComponent).join(HASH_SEP)}`;
}

function parseEpisodeHash(hash: string): ActiveEpisode | null {
  if (!hash || hash.length <= 1) return null;
  const parts = hash
    .slice(1)
    .split(HASH_SEP)
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
  if (parts.length !== 4) return null;
  const [hProvider, hEpId, hEpNum, hSubdub] = parts;
  if (!hProvider || !hEpId || !hEpNum || !hSubdub) return null;
  return { provider: hProvider, epId: hEpId, epNum: hEpNum, subdub: hSubdub };
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
  const animetitle = useStore(useTitle, (state) => state.animetitle);
  const settings = useStore(useSettings, (state) => state.settings);
  const router = useRouter();

  const [activeEpisode, setActiveEpisode] = useState<ActiveEpisode>({ epId, provider, epNum, subdub });

  // Đồng bộ lại khi props THẬT SỰ đổi (vd đổi provider vừa router.push xong, page.tsx chạy
  // lại thật với props mới — lúc đó props mới là nguồn đúng cần theo).
  useEffect(() => {
    setActiveEpisode({ epId, provider, epNum, subdub });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epId, provider, epNum, subdub]);

  // ✅ đọc hash lúc mount (deep-link khi share link đang xem tập/server khác cùng provider).
  // Chỉ chạy 1 LẦN — cố tình để mảng dependency rỗng, tránh tự ghi đè ngược ngay sau khi
  // user vừa đổi.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromHash = parseEpisodeHash(window.location.hash);
    if (fromHash) setActiveEpisode(fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [sourceData, setSourceData] = useState<VideoData | null>(null);
  const [allProvidersData, setAllProvidersData] = useState<Provider[] | null>(null);
  const [groupedEp, setGroupedEp] = useState<GroupedEp | null>(null);
  const [skiptimes, setSkipTimes] = useState<SkipTime[]>([]);
  const [episodeMap, setEpisodeMap] = useState<Record<number, Record<string, string>>>({});

  const [isEpisodeListLoading, setIsEpisodeListLoading] = useState(true);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);

  // ✅ FIX: tách 2 error state riêng biệt cho 2 effect độc lập (episode list vs player
  // source) — mỗi effect tự quản lý lỗi của chính nó, không có nhánh nào kéo sập nhánh kia
  // (đúng tinh thần Promise.allSettled).
  const [episodeListError, setEpisodeListError] = useState<string | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [hlsError, setHlsError] = useState(false);

  // ── Server selection: danh sách server thô của provider+ep hiện tại,
  // đổi server chỉ setState lại sourceData, KHÔNG router.push -> KHÔNG reload trang.
  const [serverList, setServerList] = useState<ServerOption[]>([]);
  const [activeServerKey, setActiveServerKey] = useState<string | null>(null);
  const [isServerSwitching, setIsServerSwitching] = useState(false);

  const resolveAndSetSource = useCallback(
    async (server?: ServerOption | null) => {
      const sourceResponse = await getSources(
        id,
        activeEpisode.provider,
        activeEpisode.epId,
        parseInt(activeEpisode.epNum),
        activeEpisode.subdub,
        server
      );
      if (!sourceResponse?.sources || sourceResponse.sources.length === 0) {
        throw new Error("Không thể tải nguồn video cho tập này.");
      }
      setSourceData(sourceResponse);
      // Nếu server được truyền vào trực tiếp (user tự chọn) -> dùng key đó.
      // Nếu không (lần load đầu / đổi tập) -> backend tự chọn server mặc định và trả về
      // `resolvedServerKey` để vẫn highlight đúng nút dù getServers/getSources chạy song
      // song, không đợi nhau.
      const responseWithKey = sourceResponse as VideoData & { resolvedServerKey?: string };
      setActiveServerKey(server?.key ?? responseWithKey.resolvedServerKey ?? null);
      return sourceResponse;
    },
    [id, activeEpisode.provider, activeEpisode.epId, activeEpisode.epNum, activeEpisode.subdub]
  );

  const handleServerSelect = async (server: ServerOption) => {
    if (isServerSwitching || server.key === activeServerKey) return;
    setIsServerSwitching(true);
    setHlsError(false);
    try {
      await resolveAndSetSource(server);
    } catch (err) {
      console.error(err);
      toast.error("Server này hiện không phát được, thử server khác giúp mình nhé.");
    } finally {
      setIsServerSwitching(false);
    }
  };

  // ✅ FIX (theo yêu cầu mới nhất):
  // - Đổi PROVIDER khác (vd anineko -> animehay): điều hướng THẬT bằng router.push, chấp
  //   nhận reload lại page (Server Component chạy lại) — allProvidersData/servers đã có
  //   cache (Redis /api/episode + /api/source servers cache) nên chi phí không lớn, và URL
  //   path luôn phản ánh đúng provider/tập đang xem cho SSR/metadata/watch-history.
  // - Cùng PROVIDER, chỉ đổi tập/subdub/server: KHÔNG điều hướng — chỉ cập nhật state cục bộ
  //   + hash (không đụng pathname), giữ nguyên hành vi cũ (không remount PlayerComponent).
  const handleProviderNavigate = useCallback(
    (newProvider: string, newEpId: string, newEpNum: number | string, newSubdub: string) => {
      const newEpNumStr = String(newEpNum);

      if (newProvider !== activeEpisode.provider) {
        router.push(
          buildWatchUrl({
            id,
            provider: newProvider,
            epId: newEpId,
            epNum: newEpNumStr,
            subdub: newSubdub,
          })
        );
        return;
      }

      setActiveEpisode({ epId: newEpId, provider: newProvider, epNum: newEpNumStr, subdub: newSubdub });

      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", buildEpisodeHash(newProvider, newEpId, newEpNumStr, newSubdub));
      }
    },
    [activeEpisode.provider, id, router]
  );

  // ── EFFECT A: danh sách tập phim (getEpisodes) ─────────────────────────────
  // ✅ FIX: chỉ phụ thuộc `id` (+ trạng thái phim), KHÔNG phụ thuộc provider/epId/epNum/subdub
  // nữa. Đổi tập/subdub/server trong cùng provider KHÔNG bao giờ chạy lại effect này — chỉ
  // lọc lại từ allProvidersData đã có sẵn (xem effect C). Đổi provider thì đã reload cả
  // trang qua router.push ở trên nên effect này tự nhiên chạy lại với `id` — nhưng vẫn có
  // cache phía API (`getEpisodes`) nên không tốn thêm gì so với trước.
  useEffect(() => {
    let cancelled = false;

    const fetchEpisodesList = async () => {
      setIsEpisodeListLoading(true);
      setEpisodeListError(null);
      try {
        const providersResponse = await getEpisodes(id, data?.status, false);
        if (cancelled) return;
        if (!providersResponse || providersResponse.length === 0) {
          throw new Error("Không tìm thấy danh sách tập phim.");
        }
        setAllProvidersData(providersResponse);
      } catch (err: unknown) {
        if (cancelled) return;
        console.error("Lỗi khi fetch Episodes:", err);
        const message = (err as Error).message || "Lỗi tải danh sách tập phim.";
        toast.error(message);
        setEpisodeListError(message);
      } finally {
        if (!cancelled) setIsEpisodeListLoading(false);
      }
    };

    fetchEpisodesList();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, data?.status]);

  // ── EFFECT B: server list + resolve nguồn phát (player) ─────────────────────
  // ✅ getServers() và getSources() chạy SONG SONG bằng Promise.allSettled thay vì tuần tự
  // (mọi resolve*Source đã tự có logic chọn server mặc định độc lập khi không có serverRaw).
  //
  // Phụ thuộc activeEpisode (state cục bộ) -> effect này chạy lại khi đổi tập/subdub/server
  // trong CÙNG provider, component KHÔNG bị remount (không có navigation thật).
  useEffect(() => {
    let cancelled = false;
    const { provider: curProvider, epId: curEpId, epNum: curEpNum, subdub: curSubdub } = activeEpisode;

    const fetchPlayerSource = async () => {
      setIsPlayerLoading(true);
      setPlayerError(null);
      setHlsError(false);
      setSkipTimes([]);
      setServerList([]);
      setActiveServerKey(null);

      const serversPromise = getServers(id, curProvider, curEpId, parseInt(curEpNum), curSubdub).catch((err) => {
        console.warn("⚠️ Lỗi khi fetch danh sách server:", err);
        return null;
      });

      // Không truyền server -> để backend tự chọn mặc định (song song với serversPromise).
      const sourcePromise = resolveAndSetSource(null);

      const [serversResult, sourceResult] = await Promise.allSettled([serversPromise, sourcePromise]);

      if (cancelled) return;

      if (serversResult.status === "fulfilled" && serversResult.value) {
        setServerList(serversResult.value.servers ?? []);
      }

      if (sourceResult.status === "rejected") {
        console.error("Lỗi khi fetch Sources:", sourceResult.reason);
        const message = (sourceResult.reason as Error)?.message || "Lỗi tải nguồn video.";
        toast.error(message);
        setPlayerError(message);
        setIsPlayerLoading(false);
        return;
      }

      const sourceResponse = sourceResult.value as VideoData;

      if (data?.idMal) {
        const episodeLength = sourceResponse?.outro?.end || sourceResponse?.intro?.end || 1500;
        let skipFetched = false;
        try {
          const skipResponse = await fetch(
            `https://api.aniskip.com/v2/skip-times/${data.idMal}/${parseInt(
              curEpNum
            )}?types[]=op&types[]=ed&episodeLength=${episodeLength}`
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

        if (!skipFetched) {
          const newSkipTimes: SkipTime[] = [];
          if (sourceResponse.intro) newSkipTimes.push({ startTime: sourceResponse.intro.start, endTime: sourceResponse.intro.end, text: "Opening" });
          if (sourceResponse.outro) newSkipTimes.push({ startTime: sourceResponse.outro.start, endTime: sourceResponse.outro.end, text: "Ending" });
          setSkipTimes(newSkipTimes);
        }
      }

      if (data) useDataInfo.setState({ dataInfo: data });
      useNowPlaying.setState({ nowPlaying: { epId: curEpId, provider: curProvider, epNum: curEpNum, subtype: curSubdub } });

      setIsPlayerLoading(false);
    };

    fetchPlayerSource();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeEpisode.provider, activeEpisode.epId, activeEpisode.epNum, activeEpisode.subdub]);

  // ── EFFECT C: groupedEp/episodeMap — derive từ allProvidersData đã có sẵn, không fetch
  // gì thêm. Đây chính là bước "chỉ lọc lại từ mảng chứa toàn bộ episode" khi đổi tập/subdub
  // trong cùng provider.
  useEffect(() => {
    const { provider: curProvider, epNum: curEpNum, subdub: curSubdub } = activeEpisode;
    if (allProvidersData && curProvider && curEpNum) {
      const currentProviderData = allProvidersData.find((p) => p.providerId === curProvider);
      if (currentProviderData) {
        let episodes: Episode[] = [];
        if (currentProviderData.consumet) {
          const episodesObj = currentProviderData.episodes as { sub?: Episode[]; dub?: Episode[] };
          episodes = curSubdub === "sub" ? episodesObj.sub ?? [] : episodesObj.dub ?? [];
        } else {
          episodes = currentProviderData.episodes as Episode[];
        }

        const epNumInt = parseInt(curEpNum);
        setGroupedEp({
          previousep: episodes.find((e) => e.number === epNumInt - 1),
          currentep: episodes.find((e) => e.number === epNumInt),
          nextep: episodes.find((e) => e.number === epNumInt + 1),
        });
      }

      const newEpisodeMap: Record<number, Record<string, string>> = {};
      allProvidersData.forEach((prov) => {
        let episodes: Episode[] = [];
        if (Array.isArray(prov.episodes)) {
          episodes = prov.episodes;
        } else if (prov.episodes.sub && prov.episodes.sub.length > 0) {
          episodes = prov.episodes.sub;
        } else if (prov.episodes.dub) {
          episodes = prov.episodes.dub;
        }

        episodes.forEach((ep) => {
          const episodeId = ep.id || ep.episodeId;
          if (!episodeId || ep.number == null) return;
          if (!newEpisodeMap[ep.number]) newEpisodeMap[ep.number] = {};
          newEpisodeMap[ep.number][prov.providerId] = episodeId;
        });
      });
      setEpisodeMap(newEpisodeMap);
    }
  }, [allProvidersData, activeEpisode.provider, activeEpisode.epNum, activeEpisode.subdub]);

  const primarySource =
    sourceData?.sources?.find((i) => (i.quality === "default" || i.quality === "auto") && !i.isEmbed) ||
    sourceData?.sources?.find((i) => i.quality === "1080p" && !i.isEmbed) ||
    sourceData?.sources?.find((i) => !i.isEmbed);

  const embedFallbackSource = sourceData?.sources?.find((s) => s.isEmbed);

  const isInitiallyEmbed = hlsError || !primarySource;
  const src = primarySource?.url || "";

  const handleHlsError = () => {
    console.warn("🔥 Lỗi HLS, đang thử fallback sang iframe...");
    if (embedFallbackSource) {
      setHlsError(true);
    } else {
      toast.error("Nguồn HLS bị lỗi và không có nguồn dự phòng.");
    }
  };

  const referer = sourceData?.headers?.Referer || "";

  const subtitles: TextTrackInit[] =
    sourceData?.tracks
      ?.filter((track) => track.lang !== "Thumbnails" && track.url)
      ?.map((track) => ({
        src: `${checkEnvironment()}/api/stream?url=${encodeURIComponent(track.url)}&referer=${encodeURIComponent(referer)}`,
        label: track.lang,
        kind: "subtitles",
        default: track.lang.toLowerCase().includes("vi"),
      })) || [];

  const thumbnails: { src: string }[] =
    sourceData?.tracks
      ?.filter((track) => track.lang === "Thumbnails" && track.url)
      ?.map((track) => ({
        src: `${checkEnvironment()}/api/stream?url=${encodeURIComponent(track.url)}&referer=${encodeURIComponent(referer)}`,
      })) || [];

  const validData: AnimeItem = data || {
    id: 0,                       // không phải "" — AnimeItem.id là number
    title: { romaji: "Unknown Title" },
    idMal: null,
  };

  // Player.tsx (không nằm trong bộ file bạn gửi) đang nhận session dạng rút gọn
  // { user: { name, token } } chứ không phải Session của next-auth -> giữ nguyên adapter cũ.
  const adaptedSession = session
    ? {
        user: session.user
          ? {
              name: session.user.name ?? undefined,
              token: (session.user as { token?: string })?.token ?? undefined,
            }
          : undefined,
      }
    : undefined;

  return (
    <div className="xl:w-[99%]">
      <div>
        <div className="mb-2">
          {isPlayerLoading ? (
            <div className="h-full w-full rounded-[8px] flex items-center justify-center aspect-video border border-solid border-white border-opacity-10">
              <CircleLoader size={80} />
            </div>
          ) : playerError ? (
            <div className="h-full w-full aspect-video rounded-[8px] flex items-center justify-center flex-col text-center border border-solid border-white border-opacity-10">
              <p className="mb-2 text-xl">(╯°□°)╯︵ ɹoɹɹƎ</p>
              <p>Không thể tải tập phim. Vui lòng thử lại sau.</p>
            </div>
          ) : (
            <div className="h-full w-full aspect-video overflow-hidden">
              {(isInitiallyEmbed || hlsError) && embedFallbackSource ? (
                <CustomIframePlayer
                  src={embedFallbackSource.url}
                  episodeId={activeEpisode.epId}
                  episodeNum={parseInt(activeEpisode.epNum)}
                  animeTitle={validData.title[animetitle] || validData.title.romaji || "Unknown"}
                  autoNext={true}
                  onAutoNext={() => {
                    if (groupedEp?.nextep) {
                      handleProviderNavigate(
                        activeEpisode.provider,
                        groupedEp.nextep.id || groupedEp.nextep.episodeId || "",
                        groupedEp.nextep.number ?? "",
                        activeEpisode.subdub
                      );
                    }
                  }}
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
                  // ✅ WIRING SETTING "load" (idle/visible/eager) — trước đây SettingsPage ghi
                  // vào store nhưng không nơi nào đọc lại, nên set gì cũng vô tác dụng.
                  load={settings.load as "idle" | "visible" | "eager"}
                />
              )}
            </div>
          )}
        </div>

        {/* Server switcher — đổi server chỉ resolve lại nguồn, KHÔNG router.push, nằm ngay
            dưới video player. */}
        <ServerSelector
          servers={serverList}
          activeKey={activeServerKey}
          loading={isServerSwitching}
          onSelect={handleServerSelect}
        />

        <div className="my-2 mx-2 sm:mx-1 px-1 lg:px-0">
          <h2 className="text-xl">{validData.title[animetitle] || validData.title.romaji}</h2>
          <h2 className="text-base text-[#ffffffb2]">{`TẬP ${activeEpisode.epNum}`}</h2>
        </div>
      </div>
      <div className="w-[98%] mx-auto lg:w-full">
        <PlayerEpisodeList
          isLoading={isEpisodeListLoading}
          id={id}
          data={validData}
          onprovider={activeEpisode.provider}
          epnum={parseInt(activeEpisode.epNum)}
          allProvidersData={allProvidersData}
          episodeMap={episodeMap}
          onProviderNavigate={handleProviderNavigate}
        />
        {!isEpisodeListLoading && episodeListError && (
          <p className="text-center text-sm text-[#ffffffb2] mt-2">
            Không tải được danh sách tập phim, nhưng bạn vẫn có thể xem tập hiện tại.
          </p>
        )}
      </div>
    </div>
  );
};

export default PlayerComponent;