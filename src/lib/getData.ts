import { checkEnvironment } from "./checkEnvironment";

interface RecentEpisode {
  id: string;
  title: {
    romaji: string;
    english?: string;
    native?: string;
  };
  coverImage: {
    large: string;
    medium: string;
    extraLarge?: string;
  };
  status: string;
  format: string;
  currentEpisode?: number;
  totalEpisodes?: number;
  latestEpisode?: string;
}

export interface Episode {
  id?: string;
  episodeId?: string;
  number: number;
  title?: string;
  description?: string;
  img?: string;
  image?: string;
  isFiller?: boolean;
}

export interface Provider {
    providerId: string;
    id: string; // Thêm id vào Provider
    consumet?: boolean;
    episodes: Episode[] | { sub?: Episode[]; dub?: Episode[] };
}

export interface AnimeItem {
  id: string | number;
  bannerImage?: string;
  coverImage?: {
    extraLarge?: string;
  };
  type?: string;
  status?: string;
  nextAiringEpisode?: {
    episode: number;
  };
}

export interface Source {
  sources: {
    url: string;
    quality: string;
    isM3U8: boolean;
    isEmbed?: boolean;
  }[];
  // subtitles?: {
  //   lang: string;
  //   url: string;
  // }[];
   tracks?: {
    url: string;
    lang: string;
    kind?: string; // Thêm 'kind' để có thể chứa cả thumbnails
  }[];
  headers?: Record<string, string>;
  download?: string;
  intro?: {
    start: number;
    end: number;
  };
  outro?: {
    start: number;
    end: number;
  };
}

export const getRecentEpisodes = async (): Promise<RecentEpisode[] | undefined> => {
  try {
    const response = await fetch(`${checkEnvironment()}/api/recent`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Failed to fetch recent episodes");
    const data = await response.json();
     // ✅ Console log dữ liệu từ API
    // console.log("🎬 Recent Episodes from API:", data);
    return data as RecentEpisode[];
  } catch (error) {
    console.error("Error fetching Anify Recent Episodes:", error);
    return [];
  }
};

export const getEpisodes = async (
  id: string,
  status: string | null | undefined, // Nhận vào chuỗi status
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
    // console.log(`🎬 Phản hồi API Tập Phim cho ID ${id}:`, JSON.stringify(data, null, 2));
    return data as Provider[];
  } catch (error) {
    console.error("Error fetching Consumet Episodes:", error);
    return undefined;
  }
};

export const getSources = async (
  id: string,
  provider: string,
  epid: string,
  epnum: number,
  subdub: string
): Promise<Source | undefined> => {
  try {
    const response = await fetch(`${checkEnvironment()}/api/source/${id}`, {
      method: "POST",
      body: JSON.stringify({
        source:
          provider === "gogoanime" || provider === "gogobackup"
            ? "consumet"
            : "anify",
        provider: provider === "gogobackup" ? "gogoanime" : provider,
        episodeid: epid,
        episodenum: epnum,
        subtype: subdub,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Failed to fetch episodes");

    const data = await response.json();
    
     // ✅ LOGIC PROXY TOÀN DIỆN
    if (data?.sources?.length > 0) {
      const referer = data?.headers?.Referer || "";
      const hasEmbedSourceFromApi = data.sources.some((source: any) => !source.url.includes(".m3u8"));

      data.sources = data.sources.map((source: any) => {
        const originalUrl = source.url;
        if (originalUrl.includes(".m3u8")) {
          return {
            ...source,
            url: `${checkEnvironment()}/api/stream?url=${encodeURIComponent(originalUrl)}&referer=${encodeURIComponent(referer)}`,
            isEmbed: false,
          };
        }
        return {
          ...source,
          url: `${checkEnvironment()}/api/embed?url=${encodeURIComponent(originalUrl)}`,
          isEmbed: true,
        };
      });

      if (!hasEmbedSourceFromApi && referer) {
        console.log("🛠️ API chỉ có HLS, đang tạo nguồn embed dự phòng...");
        
        // ✅ SỬA LỖI Ở ĐÂY: Tạo URL embed đúng cấu trúc
        const fallbackEmbedUrl = `https://megaplay.buzz/stream/s-2/${epid.split('/')[0]}/${subdub}`;
        
        data.sources.push({
          url: `${checkEnvironment()}/api/embed?url=${encodeURIComponent(fallbackEmbedUrl)}`,
          quality: 'auto-fallback',
          isEmbed: true,
        });
      }
    }

    console.log(`🎬 Phản hồi API Nguồn cho ID ${id}, Tập ${epnum}:`, JSON.stringify(data, null, 2));
    return data as Source;
  } catch (error) {
    console.error("Error fetching Episode sources:", error);
  }
};

