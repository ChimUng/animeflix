import axios from 'axios';
// import { redis } from '@/lib/rediscache'; 
import { NextResponse, NextRequest } from "next/server";
// import AnimePahe from '@/components/providers/animepahe';
import { RawEpisode, AnifyProvider, VideoData } from '@/utils/EpisodeFunctions';

// Định nghĩa kiểu dữ liệu cho phần body của request
interface RequestBody {
  source: string;
  provider: string;
  episodeid: string;
  episodenum: number | string;
  subtype: string;
}

// Định nghĩa kiểu dữ liệu cho params của route
// interface RouteParams {
//   params: {
//     epsource: string[];
//   };
// }

// Hàm lấy dữ liệu từ Consumet API
async function consumetEpisode(id: string): Promise<RawEpisode[] | null> {
    try {
        const { data } = await axios.get(
            `${process.env.CONSUMET_URI}/meta/anilist/watch/${id}`
        );
        return data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

/**
 * Gọi AniZip để lấy MAL ID từ Anilist ID (fallback)
 */
async function fetchAniZipMalId(anilistId: string): Promise<string | null> {
  try {
    const { data } = await axios.get(`https://api.ani.zip/mappings?anilist_id=${anilistId}`);
    return data?.mappings?.mal_id?.toString() || null;
  } catch (error: unknown) {
    console.error('fetchAniZipMalId error:', (error as Error)?.message ?? error);
    return null;
  }
}

/**
 * Gọi MalSync để tìm slug của Hianime/Zoro
 * Trả về slug ví dụ: 'steinsgate-0-92' hoặc null nếu không tìm được
 */
async function malSyncGetZoroSlug(id: string): Promise<string | null> {
  try {
    const { data } = await axios.get(`${process.env.MALSYNC_URI}${id}`);
    // if (!data?.Sites) return null;

    const sites = Object.keys(data.Sites).map((providerId) => ({
      providerId: providerId.toLowerCase(),
      data: Object.values(data.Sites[providerId]) as { title: string; url?: string }[],
    }));

    const zoroSite = sites.find((s) => s.providerId === 'zoro');
    if (!zoroSite) return null;

    const rawUrl = zoroSite.data?.[0]?.url;
    if (!rawUrl) return null;

    // chuyển 'https://hianime.to/steinsgate-0-92' => 'steinsgate-0-92'
    const slug = rawUrl.replace(/^https?:\/\/(www\.)?hianime\.to\//i, '').replace(/^\/|\/$/g, '');
    return slug || null;
  } catch (error: unknown) {
    console.error('malSyncGetZoroSlug error:', (error as Error)?.message ?? error);
    return null;
  }
}

/**
 * Build animeEpisodeId theo doc Zoro: "<slug>?ep=<episodeid>"
 * Quy trình:
 *  1) Thử MalSync(anilistId)
 *  2) Nếu fail, thử fetchAniZipMalId -> gọi lại MalSync với MAL ID
 *  3) Nếu tìm được slug trả về `${slug}?ep=${episodeid}` else null
 */
export async function buildZoroAnimeEpisodeId(
  anilistId: string,
  episodeid: string
): Promise<string | null> {
  // 1) Thử MalSync với anilist id
  let slug = await malSyncGetZoroSlug(anilistId);

  // 2) Fallback: AniZip -> MAL ID -> MalSync
  if (!slug) {
    const malId = await fetchAniZipMalId(anilistId);
    if (malId && malId !== anilistId) {
      slug = await malSyncGetZoroSlug(malId);
    }
  }

  if (!slug) return null;
  return `${slug}?ep=${episodeid}`;
}

// Hàm lấy dữ liệu từ nguồn Zoro (với fallback là Anify)
async function zoroEpisode(
  provider: string,
  episodeid: string,
  epnum: number | string,
  id: string,
  subtype: string
): Promise<VideoData | null> {
  try {
    let animeEpisodeId: string | null = null;

    // ✅ KIỂM TRA: Nếu episodeid đã chứa "?ep=" thì đã được build rồi
    if (episodeid.includes('?ep=')) {
      console.log('✅ episodeid đã ở dạng đầy đủ:', episodeid);
      animeEpisodeId = episodeid;
    } else {
      // ✅ Nếu episodeid chỉ là số episode thuần túy, build animeEpisodeId
      console.log('🔨 Building animeEpisodeId từ:', { id, episodeid });
      animeEpisodeId = await buildZoroAnimeEpisodeId(id, episodeid);
    }

    // Fallback: nếu vẫn null thì dùng episodeid gốc
    const paramValue = animeEpisodeId ?? episodeid;
    
    console.log('🎯 Final animeEpisodeId:', paramValue);

    // Bước 1: Gọi API lấy danh sách servers
    const serverRes = await axios.get(`${process.env.ZORO_URI}/episode/servers`, {
      params: {
        animeEpisodeId: paramValue,
      },
    });

    const serverData = serverRes.data?.data;
    if (!serverData) {
      console.error('❌ Không có serverData');
      return null;
    }

    const serverList = serverData[subtype]; // subtype là 'sub' hoặc 'dub'
    if (!serverList || serverList.length === 0) {
      console.error('❌ Không có serverList cho subtype:', subtype);
      return null;
    }

    const firstServer = serverList[1]; // Ưu tiên lấy server đầu tiên
    if (!firstServer) {
      console.error('❌ Không có firstServer');
      return null;
    }

    console.log('🎬 Sử dụng server:', firstServer.serverName);

    // Bước 2: Gọi API lấy stream từ server đầu tiên
    const sourceRes = await axios.get(`${process.env.ZORO_URI}/episode/sources`, {
      params: {
        animeEpisodeId: paramValue,
        server: firstServer.serverName,
        category: subtype,
      },
    });

    const videoData = sourceRes.data?.data;
    if (!videoData) {
      console.error('❌ Không có videoData');
      return null;
    }

    console.log('✅ Lấy videoData thành công');
    return videoData;
  } catch (error) {
    console.error('❌ zoroEpisode error:', error);
    return null;
  }
}

// ✅ HÀM MỚI CHO 9ANIME
async function nineAnimeEpisode(
  provider: string,
  episodeid: string,
  epnum: number | string,
  id: string,
  subtype: string
): Promise<VideoData | null> {
  try {
    let animeEpisodeId: string | null = null;

    if (episodeid.includes('?ep=')) {
      console.log('✅ [9anime] episodeid đã ở dạng đầy đủ:', episodeid);
      animeEpisodeId = episodeid;
    } else {
      console.log('🔨 [9anime] Building animeEpisodeId từ:', { id, episodeid });
      animeEpisodeId = await buildZoroAnimeEpisodeId(id, episodeid);
    }

    const paramValue = animeEpisodeId ?? episodeid;
    console.log('🎯 [9anime] Final animeEpisodeId:', paramValue);

    const server = 'hd-1';

    const streamRes = await axios.get(`${process.env.ZENIME_URL}/api/stream`, {
      params: {
        id: paramValue,
        server: server,
        type: subtype,
      },
    });

    const streamData = streamRes.data;

    if (!streamData?.success || !streamData?.results?.streamingLink) {
      console.error('❌ [9anime] Không có streamingLink');
      return null;
    }

    const streamingLink = streamData.results.streamingLink;

    // Fix: streamingLink là array, lấy phần tử đầu tiên
    const firstStream = Array.isArray(streamingLink) ? streamingLink[0] : streamingLink;

    if (!firstStream) {
      console.error('❌ [9anime] Không có firstStream');
      return null;
    }

    // Fix: link là string trực tiếp, không phải object có .file
    const fileUrl = typeof firstStream.link === 'string'
      ? firstStream.link
      : firstStream.link?.file;

    if (!fileUrl) {
      console.error('❌ [9anime] Không có file URL');
      return null;
    }

    // tracks nằm ở results.tracks, không phải streamingLink.tracks
    const tracks = streamData.results.tracks ?? firstStream.tracks ?? [];

    const videoData: VideoData = {
      sources: [
        {
          url: fileUrl,
          isM3U8: firstStream.type === 'hls',
          type: firstStream.type,
        }
      ],
      tracks: tracks.map((track: { file: string; label: string; kind: string; default?: boolean }) => ({
        url: track.file,
        lang: track.label,
        kind: track.kind,
        default: track.default,
      })),
      intro: streamData.results.intro ?? firstStream.intro,
      outro: streamData.results.outro ?? firstStream.outro,
      headers: {
        Referer: 'https://rapid-cloud.co/',
      },
    };

    console.log('✅ [9anime] Lấy videoData thành công');
    return videoData;
  } catch (error) {
    console.error('❌ [9anime] nineAnimeEpisode error:', error);
    return null;
  }
}

// Hàm lấy dữ liệu từ Anify API
async function AnifyEpisode(
    provider: string, 
    episodeid: string, 
    epnum: number | string, 
    id: string, 
    subtype: string
): Promise<AnifyProvider | null> {
    try {
        const { data } = await axios.get(
            `https://api.anify.tv/sources?providerId=${provider}&watchId=${encodeURIComponent(
                episodeid
            )}&episodeNumber=${epnum}&id=${id}&subType=${subtype}`
        );
        return data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

// ✅ HÀM AnimePahe - SIMPLE VERSION
async function animePaheEpisode(episodeid: string, animeId: string, epNum: number | string): Promise<VideoData | null> {
  try {
    console.log('🔍 [AnimePahe] episodeId:', episodeid);

    // Primary: Consumet
    try {
      const { data } = await axios.get(
        `${process.env.CONSUMET_URI}/anime/animepahe/watch`,
        { params: { episodeId: episodeid }, timeout: 15000 }
      );

      if (data?.sources?.length > 0) {
        data.headers = {
          Referer: 'https://kwik.cx/',
          Origin: 'https://animepahe.si',
        };
        console.log('✅ [AnimePahe] Consumet success');
        return data;
      }
    } catch {
      console.warn('⚠️ [AnimePahe] Consumet failed, trying fallback...');
    }

    // Fallback: core.justanime.to
    console.log('🔄 [AnimePahe] Fallback to justanime...');
    const { data: fallback } = await axios.get(
      `https://core.justanime.to/api/watch/${animeId}/episode/${epNum}/animepahe`,
      { timeout: 15000,
        headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://justanime.to/',
        'Origin': 'https://justanime.to',
    }
      }
      
    );

    const sources = fallback?.sub?.sources || fallback?.dub?.sources;
    if (!sources?.length) {
      console.error('❌ [AnimePahe] Fallback no sources');
      return null;
    }
    const videoData: VideoData = {
      sources: sources.map((s: { url: string; quality: string; isM3U8: boolean }) => ({
        url: s.url, // ✅ URL gốc, không wrap
        quality: s.quality,
        isM3U8: s.isM3U8,
      })),
      tracks: [],
      headers: {
        Referer: 'https://kwik.cx/',
        Origin: 'https://animepahe.si',
        'x-provider': 'animepahe', // ✅ Flag để client nhận biết
      },
    };

    console.log('✅ [AnimePahe] Fallback success');
    return videoData;

  } catch (error) {
    console.error('❌ [AnimePahe]:', error);
    return null;
  }
}

// Xử lý request POST
export const POST = async (req: NextRequest, context: { params: Promise<{ epsource: string[] }> }): Promise<NextResponse> => {
    const { params } = context;
    const resolvedParams = await params; // ✅ phải await
    const id = resolvedParams.epsource[0];

    const { source, provider, episodeid, episodenum, subtype}: RequestBody = await req.json();

    /*
    // Đoạn mã cache với Redis (đã được type-safe)
    const cacheKey = `source:${params.epsource[0]}`;
    const cacheTime = 25 * 60; // 25 phút

    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            const cachedData = JSON.parse(cached as string);
            return NextResponse.json(cachedData);
        }
    } catch (e) {
        console.error("Lỗi khi đọc cache Redis:", e)
    }

    // ... logic lấy data ...

    try {
        await redis.setex(cacheKey, cacheTime, JSON.stringify(data));
    } catch(e) {
        console.error("Lỗi khi ghi cache Redis:", e)
    }

    return NextResponse.json(data);
    */

    if (source === "consumet") {
        const data = await consumetEpisode(episodeid);
        return NextResponse.json(data);
    }

    if (provider === "zoro") {
        const data = await zoroEpisode(provider, episodeid, episodenum, id, subtype);
        return NextResponse.json(data);
    }

     if (provider === "9anime") {
        const data = await nineAnimeEpisode(provider, episodeid, episodenum, id, subtype);
        return NextResponse.json(data);
    }

     if (provider === "animepahe") {
    const data = await animePaheEpisode(episodeid, id, episodenum);
    return NextResponse.json(data);
  }

    if (source === "anify") {
        const data = await AnifyEpisode(provider, episodeid, episodenum, id, subtype);
        return NextResponse.json(data);
    }

    
    // if (source === "animepahe") {
    //     const data = await animepaheEpisode(Number(id), episodeid);
    //     return NextResponse.json(data);
    // }

    // Trả về lỗi nếu không có source nào khớp
    return NextResponse.json({ error: 'Invalid source specified' }, { status: 400 });
}