import axios from 'axios';
// import { redis } from '@/lib/rediscache'; 
import { NextResponse, NextRequest } from "next/server";
// import AnimePahe from '@/components/providers/animepahe';
import { RawEpisode, Episode, AnifyProvider } from '@/utils/EpisodeFunctions';

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
  id: string, // đây là id từ URL (ví dụ 21) — mình coi là Anilist ID
  subtype: string
): Promise<Episode[] | null> {
  try {
    // --- build đúng animeEpisodeId theo doc Zoro ---
    const animeEpisodeId = await buildZoroAnimeEpisodeId(id, episodeid);

    // Nếu animeEpisodeId null thì fallback thử dùng episodeid thô (cái cũ của bạn)
    const paramValue = animeEpisodeId ?? episodeid;

    // Gọi servers (lưu ý: axios sẽ tự encode param; nếu Zoro yêu cầu raw '?', bạn có thể thay đổi xuống phần commented)
    const serverRes = await axios.get(`${process.env.ZORO_URI}/episode/servers`, {
      params: {
        animeEpisodeId: paramValue,
      },
    });

    const serverData = serverRes.data?.data;
    if (!serverData) return null;

    const serverList = serverData[subtype]; // subtype là 'sub' hoặc 'dub'
    if (!serverList || serverList.length === 0) return null;

    const firstServer = serverList[0]; // ưu tiên lấy server đầu tiên

    // Bước 2: Gọi API lấy stream từ server đầu tiên
    const sourceRes = await axios.get(`${process.env.ZORO_URI}/episode/sources`, {
      params: {
        animeEpisodeId: paramValue,
        server: firstServer.serverName,
        category: subtype,
      },
    });

    const videoData = sourceRes.data?.data;
    if (!videoData) return null;

    return videoData; // chứa các link stream, headers, subtitle,...
  } catch (error) {
    console.error('zoroEpisode error:', error);
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

// async function animepaheEpisode(malId: number, episodeId: string): Promise<{ url: string; length: number } | null> {
// 	try {
// 		const provider = new AnimePahe(malId);
// 		const { url, length } = await provider.getSourceInfo(episodeId);
// 		return {
// 			url,
// 			length
// 		};
// 	} catch (error) {
// 		console.error(error);
// 		return null;
// 	}
// }


// Xử lý request POST
export const POST = async (req: NextRequest, context: { params: Promise<{ epsource: string[] }> }): Promise<NextResponse> => {
    const { params } = context;
    const resolvedParams = await params; // ✅ phải await
    const id = resolvedParams.epsource[0];

    const { source, provider, episodeid, episodenum, subtype }: RequestBody = await req.json();

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