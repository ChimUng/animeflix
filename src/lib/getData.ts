import { checkEnvironment } from "./checkEnvironment";
import { RecentEpisode, Provider, VideoData } from "@/types/episode";
import { ServerListResponse, ServerOption } from "@/types/stream";

export const getRecentEpisodes = async (): Promise<RecentEpisode[] | undefined> => {
  try {
    const response = await fetch(`${checkEnvironment()}/api/recent`, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch recent episodes");
    const data = await response.json();
    return data as RecentEpisode[];
  } catch (error) {
    console.error("Error fetching Anify Recent Episodes:", error);
    return [];
  }
};

export const getEpisodes = async (
  id: string,
  status: string | null | undefined,
  refresh = false
): Promise<Provider[] | undefined> => {
  try {
    const response = await fetch(
      `${checkEnvironment()}/api/episode/${id}?releasing=${
        status === "RELEASING" ? "true" : "false"
      }&refresh=${refresh}`,
      {
        next: { revalidate: status === "FINISHED" ? false : 3600 },
      }
    );
    if (!response.ok) throw new Error("Failed to fetch episodes");
    const data = await response.json();
    return data as Provider[];
  } catch (error) {
    console.error("Error fetching Consumet Episodes:", error);
    return undefined;
  }
};

export const getServers = async (
  id: string,
  provider: string,
  epid: string,
  epnum: number,
  subdub: string
): Promise<ServerListResponse | undefined> => {
  try {
    const response = await fetch(`${checkEnvironment()}/api/source/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "servers",
        provider: provider === "gogobackup" ? "gogoanime" : provider,
        episodeid: epid,
        episodenum: epnum,
        subtype: subdub,
      }),
    });
    if (!response.ok) throw new Error("Failed to fetch server list");
    return (await response.json()) as ServerListResponse;
  } catch (error) {
    console.error("Error fetching server list:", error);
    return undefined;
  }
};

export const getSources = async (
  id: string,
  provider: string,
  epid: string,
  epnum: number,
  subdub: string,
  server?: ServerOption | null
): Promise<VideoData | undefined> => {
  try {
    const response = await fetch(`${checkEnvironment()}/api/source/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "resolve",
        source:
          provider === "gogoanime" || provider === "gogobackup"
            ? "consumet"
            : provider === "anineko"
            ? "anineko"
            : "anify",
        provider: provider === "gogobackup" ? "gogoanime" : provider,
        episodeid: epid,
        episodenum: epnum,
        subtype: subdub,
        serverRaw: server?.raw,
        serverKey: server?.key,
      }),
    });

    if (!response.ok) throw new Error("Failed to fetch source");
    const data = await response.json();

    if (data?.sources?.length > 0) {
      const referer = data?.headers?.Referer || "";
      const hasDirectEmbedFromApi = data.sources.some((s: { url: string }) => !s.url.includes(".m3u8"));

      const isAnimepahe = data?.headers?.["x-provider"] === "animepahe";
      const isAnineko = provider === "anineko";
      const isAnimehay = provider === "animehay";

      data.sources = data.sources.map((source: { url: string; quality: string }) => {
        const originalUrl = source.url;

        if (originalUrl.includes(".m3u8")) {
          // animepahe/anineko/animehay: proxy_url trả về từ chính worker đã tự lo CORS +
          // referer injection rồi -> KHÔNG bọc thêm qua /api/stream nữa.
          if (isAnimepahe || isAnineko || isAnimehay) {
            return { ...source, isEmbed: false };
          }
          return {
            ...source,
            url: `${checkEnvironment()}/api/stream?url=${encodeURIComponent(originalUrl)}&referer=${encodeURIComponent(referer)}`,
            isEmbed: false,
          };
        }
        return { ...source, isEmbed: true };
      });

      if (isAnimepahe) {
        data.sources.sort((a: { quality: string }, b: { quality: string }) => {
          const q: Record<string, number> = { "1080": 3, "720": 2, "480": 1, "360": 0 };
          return (q[b.quality] ?? 0) - (q[a.quality] ?? 0);
        });
      }

      // ✅ Fallback iframe khi provider chỉ trả HLS và không có embed dự phòng từ API.
      // Dùng đúng format bạn yêu cầu: /stream/mal/{id}/{episoderaw}/{subdub}.
      // "malid" ở đây CHÍNH LÀ `id` đang có sẵn (không thêm prop malId mới),
      // "episoderaw" là số tập hiển thị trên UI (epnum), không phải epid nội bộ của provider.
      if (!hasDirectEmbedFromApi && referer && provider !== "animepahe" && provider !== "anineko" && provider !== "animehay") {
        const fallbackEmbedUrl = `https://megaplay.buzz/stream/mal/${id}/${epnum}/${subdub}`;
        data.sources.push({
          url: fallbackEmbedUrl,
          quality: "auto-fallback",
          isEmbed: true,
        });
      }
    }

    return data as VideoData;
  } catch (error) {
    console.error("Error fetching Episode sources:", error);
  }
};

