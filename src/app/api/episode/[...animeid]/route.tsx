// app/api/episode/[...animeid]/route.ts
import axios from 'axios';
import { redis } from '@/lib/rediscache';
import { Redis } from 'ioredis';
import { NextRequest, NextResponse } from 'next/server';
import { CombineEpisodeMeta, Episode, Provider, ImageDataItem, RawEpisode, AnifyProvider, AnimePaheEpisodeData} from '@/utils/EpisodeFunctions';

type MalSyncEntry = {
  providerId: string;
  sub?: string;
  dub?: string;
};

axios.interceptors.request.use((config) => {
  config.timeout = 9000;
  return config;
});

async function fetchConsumet(id: string): Promise<Provider[]> {
  try {
    async function fetchData(dub = false): Promise<Episode[]> {
      const { data } = await axios.get(`${process.env.CONSUMET_URI}/meta/anilist/episodes/${id}${dub ? '?dub=true' : ''}`);
      if (data?.message === 'Anime not found' || data?.length < 1) return [];
      return (data as Episode[]).map((ep) => ({
        ...ep,
        number: ep.number ?? 0,
      }));
    }

    const [subData, dubData] = await Promise.all([fetchData(), fetchData(true)]);
    const episodes: Partial<Record<'sub' | 'dub', Episode[]>> = {};
    if (subData.length > 0) episodes.sub = subData;
    if (dubData.length > 0) episodes.dub = dubData;

    return episodes.sub || episodes.dub
      ? [
          {
            consumet: true,
            providerId: 'gogoanime',
            id: 'gogoanime',
            episodes,
          },
        ]
      : [];
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error fetching consumet:", error.message);
    } else {
      console.error("Unknown error in fetchConsumet:", error);
    }
    return [];
  }
}

async function fetchAnify(id: string): Promise<Provider[]> {
  try {
    const { data } = await axios.get<{ episodes: { data: AnifyProvider[] } }>(`https://api.anify.tv/info/${id}?fields=[episodes]`);
    if (!data?.episodes?.data) return [];

    const filtered = data.episodes.data.filter((ep) => ep.providerId !== '9anime');
    return filtered.map((i) => ({
      providerId: i.providerId === 'gogoanime' ? 'gogobackup' : i.providerId,
      id: i.providerId,
      episodes: Array.isArray(i.episodes)
        ? i.episodes.map((ep) => ({
            ...ep,
            number: ep.number ?? 0,
          }))
        : {
            sub: i.episodes.sub?.map((ep) => ({ ...ep, number: ep.number ?? 0 })) || [],
            dub: i.episodes.dub?.map((ep) => ({ ...ep, number: ep.number ?? 0 })) || [],
          },
    }));
  } catch (error) {
    console.error(
      "Error fetching anify:",
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

async function fetchAniZipMalId(anilistId: string): Promise<string | null> {
  try {
    const { data } = await axios.get(`https://api.ani.zip/mappings?anilist_id=${anilistId}`);
    // console.log(`AniZip mappings for Anilist ID ${anilistId}:`, JSON.stringify(data, null, 2));
    return data?.mappings?.mal_id?.toString() || null;
  } catch (error) {
    console.error(
      `Error fetching AniZip mappings for Anilist ID ${anilistId}:`,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

async function MalSync(id: string): Promise<MalSyncEntry[] | null> {
  try {
    const { data } = await axios.get(`${process.env.MALSYNC_URI}${id}`);
    // console.log(`MalSync response for ID ${id}:`, JSON.stringify(data, null, 2));
    const sites = Object.keys(data.Sites).map((providerId) => ({
      providerId: providerId.toLowerCase(),
      data: Object.values(data.Sites[providerId]) as { title: string; url?: string }[],
    }));

    const providers = sites
      .filter((site) => site.providerId === 'gogoanime' || site.providerId === 'zoro')
      .map((site) => {
        if (site.providerId === 'gogoanime') {
          const remove = 'https://anitaku.to/category/';
          const dub = site.data.find((d) => d.title.toLowerCase().endsWith(' (dub)'));
          const subData =
            site.data.find((d) => d.title.toLowerCase().includes(' (uncensored)')) ||
            site.data.find((d) => d?.url === dub?.url?.replace(/-dub$/, '')) ||
            site.data.find((d) => !d.title.includes(')'));
          return {
            providerId: 'gogoanime',
            sub: subData?.url?.replace(remove, '') || '',
            dub: dub?.url?.replace(remove, '') || '',
          };
        } else {
          const remove = 'https://hianime.to/';
          return {
            providerId: 'zoro',
            sub: site.data[0]?.url?.replace(remove, '') || '',
          };
        }
      });

    if (providers.length === 0) {
      console.warn(`No valid providers found in MalSync for ID ${id}`);
      return null;
    }
    return providers;
  } catch (error) {
    console.error(`Error fetching MalSync for ID ${id}:`,  error instanceof Error ? error.message : error);
    // Fallback to AniZip for MAL ID
    const malId = await fetchAniZipMalId(id);
    if (malId && malId !== id) {
      console.log(`Retrying MalSync with AniZip MAL ID ${malId} for Anilist ID ${id}`);
      return MalSync(malId); // Recursive call with MAL ID
    }
    return null;
  }
}

async function fetchGogoanime(sub: string, dub: string): Promise<Provider[]> {
  try {
    const fetchData = async (id: string) => {
      const { data } = await axios.get<{ episodes: RawEpisode[] }>(`${process.env.CONSUMET_URI}/anime/gogoanime/info/${id}`);
      return (
        data?.episodes?.map((ep: RawEpisode) => ({
          ...ep,
          number: ep.number ?? 0,
        })) || []
      );
    };

    const [subData, dubData] = await Promise.all([
      sub ? fetchData(sub) : Promise.resolve([]),
      dub ? fetchData(dub) : Promise.resolve([]),
    ]);

    const episodes: Partial<Record<'sub' | 'dub', Episode[]>> = {};
    if (subData.length > 0) episodes.sub = subData;
    if (dubData.length > 0) episodes.dub = dubData;

    return episodes.sub || episodes.dub
      ? [
          {
            consumet: true,
            providerId: 'gogoanime',
            id: 'gogoanime',
            episodes,
          },
        ]
      : [];
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error fetching Gogo for ID :`, error.message);
    } else {
      console.error(`Unknown error fetching Gogo `);
    }
    return [];
  }
}

async function fetchZoro(id: string): Promise<Provider[]> {
  try {
    // console.log('Fetching Zoro API:', `${process.env.ZORO_URI}/anime/${id}/episodes`);
    const { data } = await axios.get(`${process.env.ZORO_URI}/anime/${id}/episodes`);
    // console.log('Zoro response:', JSON.stringify(data, null, 2));
    if (!data?.data?.episodes || !Array.isArray(data.data.episodes)) {
      console.warn(`No valid episodes found in Zoro response for ID ${id}`);
      return [];
    }
    return [
      {
        providerId: 'zoro',
        id: 'zoro',
        episodes: data.data.episodes.map((ep: RawEpisode): Episode => ({
          ...ep,
          number: ep.number ?? 0,
        })),
      },
    ];
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error fetching Zoro for ID ${id}:`, error.message);
    } else {
      console.error(`Unknown error fetching Zoro for ID ${id}`);
    }
    return [];
  }
}

async function fetch9anime(id: string): Promise<Provider[]> {
  if (!id) return [];

  try {
    const { data } = await axios.get<{ success: boolean; results: { totalEpisodes: number; episodes: Array<{ episode_no: number; id: string; title: string; japanese_title?: string; filler: boolean }> } }>(
      `${process.env.ZENIME_URL}/api/episodes/${id}` 
    );

    if (!data.success || !data.results?.episodes || data.results.episodes.length === 0) {
      console.warn(`No episodes from 9anime for ID ${id}`);
      return [];
    }

    const episodes: Episode[] = data.results.episodes.map((ep) => ({
      number: ep.episode_no,
      id: ep.id, 
      title: ep.title || ep.japanese_title || undefined,
      isFiller: ep.filler,
    }));

    return [
      {
        providerId: '9anime',
        id: '9anime',
        episodes, 
      },
    ];
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error fetching 9anime for ID ${id}:`, error.message);
    } else {
      console.error(`Unknown error fetching 9anime for ID ${id}`);
    }
    return [];
  }
}

// ✅ HÀM 1: Tính độ tương đồng giữa 2 chuỗi (Levenshtein Distance)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Exact match → 100%
  if (s1 === s2) return 1.0;
  
  // Normalize: Xóa ký tự đặc biệt, dấu, khoảng trắng thừa
  const normalize = (str: string) => 
    str.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').toLowerCase();
  
  const n1 = normalize(s1);
  const n2 = normalize(s2);
  
  if (n1 === n2) return 0.95;
  
  // Check contains
  if (n1.includes(n2) || n2.includes(n1)) return 0.85;
  
  // Levenshtein distance
  const matrix: number[][] = [];
  const len1 = n1.length;
  const len2 = n2.length;
  
  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = n1[i - 1] === n2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  return 1 - matrix[len1][len2] / maxLen;
}

// ✅ HÀM 2: Tìm anime phù hợp nhất từ kết quả search
interface AnimePaheSearchResult {
  id: string;
  title: string;
  type: string;
  releaseDate: number;
  rating?: number;
}

function findBestMatch(
  results: AnimePaheSearchResult[],
  targetTitle: string,
  targetYear?: number,
  targetType?: string
): AnimePaheSearchResult | null {
  if (!results || results.length === 0) return null;
  
  // Score cho mỗi kết quả
  const scored = results.map((result) => {
    let score = 0;
    
    // 1. Title similarity (weight: 70%)
    const titleScore = calculateSimilarity(result.title, targetTitle);
    score += titleScore * 0.7;
    
    // 2. Type match (weight: 15%)
    if (targetType && result.type?.toLowerCase() === targetType.toLowerCase()) {
      score += 0.15;
    }
    
    // 3. Year proximity (weight: 10%)
    if (targetYear && result.releaseDate) {
      const yearDiff = Math.abs(result.releaseDate - targetYear);
      const yearScore = Math.max(0, 1 - yearDiff / 10); // Max 10 năm chênh lệch
      score += yearScore * 0.1;
    }
    
    // 4. Priority cho "TV" type (weight: 5%)
    if (result.type?.toLowerCase() === 'tv') {
      score += 0.05;
    }
    
    return { result, score, titleScore };
  });
  
  // Sắp xếp theo score giảm dần
  scored.sort((a, b) => b.score - a.score);
  
  // Log top 3 matches
  console.log('🔍 AnimePahe search matches:');
  scored.slice(0, 3).forEach((item, idx) => {
    console.log(`  ${idx + 1}. "${item.result.title}" (${item.result.type}) - Score: ${(item.score * 100).toFixed(1)}%`);
  });
  
  // Chỉ chấp nhận nếu score > 60%
  if (scored[0].score > 0.6) {
    console.log(`✅ Best match: "${scored[0].result.title}" (${(scored[0].score * 100).toFixed(1)}%)`);
    return scored[0].result;
  }
  
  console.warn(`⚠️ No good match found (best: ${(scored[0].score * 100).toFixed(1)}%)`);
  return null;
}

// ✅ HÀM 3: Search AnimePahe by title
async function searchAnimePahe(
  title: string,
  year?: number,
  type?: string
): Promise<string | null> {
  try {
    const encodedTitle = encodeURIComponent(title);
    const { data } = await axios.get<{ results: AnimePaheSearchResult[] }>(
      `${process.env.CONSUMET_URI}/anime/animepahe/${encodedTitle}`,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );
    
    if (!data?.results || data.results.length === 0) {
      console.warn(`⚠️ AnimePahe: No results for "${title}"`);
      return null;
    }
    
    // Tìm match tốt nhất
    const bestMatch = findBestMatch(data.results, title, year, type);
    return bestMatch?.id || null;
  } catch (error) {
    console.error(`Error searching AnimePahe for "${title}":`, error);
    return null;
  }
}

// ✅ HÀM 4: Fetch AnimePahe episodes

async function fetchAnimePahe(
  anilistId: string,
  title: string,
  year?: number,
  type?: string
): Promise<Provider[]> {
  try {
    console.log(`🔍 Searching AnimePahe for: "${title}" (${year || 'unknown year'})`);
    
    // Bước 1: Search để lấy UUID
    const uuid = await searchAnimePahe(title, year, type);
    
    if (!uuid) {
      console.warn(`❌ Could not find AnimePahe ID for "${title}"`);
      return [];
    }
    
    console.log(`✅ AnimePahe UUID: ${uuid}`);
    
    // Bước 2: Fetch info để lấy DANH SÁCH EPISODES
    const { data } = await axios.get(
      `${process.env.CONSUMET_URI}/anime/animepahe/info/${uuid}`,
      { timeout: 15000 }
    );
    
    // ✅ KIỂM TRA: API có trả episodes array không?
    if (!data?.episodes || !Array.isArray(data.episodes)) {
      console.warn(`⚠️ No episodes array for AnimePahe ID: ${uuid}`);
      
      // ❌ FALLBACK CŨ (SAI) - CHỈ GẮN UUID
      // const episodes: Episode[] = [];
      // for (let i = 1; i <= data.totalEpisodes; i++) {
      //   episodes.push({
      //     id: `${uuid}-${i}`,  // ← THIẾU EPISODE HASH
      //     number: i,
      //   });
      // }
      
      // ✅ NẾU API KHÔNG TRẢ EPISODES, KHÔNG THỂ XEM ĐƯỢC
      return [];
    }
    
    console.log(`✅ AnimePahe: Found ${data.episodes.length} episodes`);
    
    // ✅ Bước 3: MAP EPISODES VỚI ID ĐẦY ĐỦ
    const episodes: Episode[] = data.episodes.map((ep: AnimePaheEpisodeData) => ({
      id: ep.id,  // ← "d58fc9f8.../f3316203..." (ĐẦY ĐỦ ANIME UUID + EPISODE HASH)
      number: ep.number,
      title: ep.title || `Episode ${ep.number}`,
    }));
    
    return [
      {
        providerId: 'animepahe',
        id: 'animepahe',
        episodes,
      },
    ];
  } catch (error) {
    console.error(`Error fetching AnimePahe:`, error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// ANINEKO PROVIDER
// ─────────────────────────────────────────────────────────────
const ANINEKO_API_URL = process.env.ANINEKO_API_URL || '';

interface AninekoSearchResult {
  title: string;
  slug: string;
  url: string;
  poster?: string | null;
  type?: string | null;
  genres?: string[];
}

interface AninekoEpisodeItem {
  number: number | null;
  title: string;
  slug: string;
  url: string;
  badges: string[];
}

function findBestMatchAnineko(
  results: AninekoSearchResult[],
  targetTitle: string,
  targetType?: string
): AninekoSearchResult | null {
  if (!results || results.length === 0) return null;

  const scored = results.map((result) => {
    let score = calculateSimilarity(result.title, targetTitle) * 0.85;
    if (targetType && result.type && result.type.toLowerCase() === targetType.toLowerCase()) {
      score += 0.15;
    }
    return { result, score };
  });

  scored.sort((a, b) => b.score - a.score);

  console.log('🔍 Anineko search matches:');
  scored.slice(0, 3).forEach((item, idx) => {
    console.log(`  ${idx + 1}. "${item.result.title}" (${item.result.type}) - Score: ${(item.score * 100).toFixed(1)}%`);
  });

  if (scored[0].score > 0.6) {
    console.log(`✅ Anineko best match: "${scored[0].result.title}" (${(scored[0].score * 100).toFixed(1)}%)`);
    return scored[0].result;
  }

  console.warn(`⚠️ Anineko: No good match found (best: ${(scored[0].score * 100).toFixed(1)}%)`);
  return null;
}

async function searchAnineko(title: string): Promise<AninekoSearchResult[]> {
  try {
    if (!ANINEKO_API_URL) return [];
    const { data } = await axios.get<{ results: AninekoSearchResult[] }>(
      `${ANINEKO_API_URL}/search`,
      { params: { q: title }, timeout: 10000 }
    );
    return data?.results || [];
  } catch (error) {
    console.error(`Error searching Anineko for "${title}":`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function fetchAnineko(title: string, type?: string): Promise<Provider[]> {
  try {
    if (!ANINEKO_API_URL) return [];
    console.log(`🔍 Searching Anineko for: "${title}"`);

    const results = await searchAnineko(title);
    if (results.length === 0) {
      console.warn(`❌ Anineko: No search results for "${title}"`);
      return [];
    }

    const bestMatch = findBestMatchAnineko(results, title, type);
    if (!bestMatch) return [];

    const { data: episodesData } = await axios.get<AninekoEpisodeItem[]>(
      `${ANINEKO_API_URL}/episodes`,
      { params: { slug: bestMatch.slug }, timeout: 15000 }
    );

    if (!Array.isArray(episodesData) || episodesData.length === 0) {
      console.warn(`⚠️ Anineko: No episodes for slug "${bestMatch.slug}"`);
      return [];
    }

    // id gộp animeSlug + episodeSlug, tách ra ở bước /source sau này
    const episodes: Episode[] = episodesData
      .filter((ep) => ep.slug && ep.number != null)
      .map((ep) => ({
        id: `${bestMatch.slug}::${ep.slug}`,
        number: ep.number ?? 0,
        title: ep.title,
      }));

    console.log(`✅ Anineko: Found ${episodes.length} episodes for "${bestMatch.title}"`);

    return [
      {
        providerId: 'anineko',
        id: 'anineko',
        episodes,
      },
    ];
  } catch (error) {
    console.error(`Error fetching Anineko:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function fetchEpisodeMeta(id: string, skip = false): Promise<ImageDataItem[]> {
  try {
    if (skip) return [];
    const { data } = await axios.get(`https://api.ani.zip/mappings?anilist_id=${id}`);
    // console.log(`AniZip response for ID ${id}:`, JSON.stringify(data, null, 2));
    const episodes = Object.values(data?.data?.episodes || {}) as ImageDataItem[];
    return episodes.map((ep) => ({
      number: ep.number ?? ep.episode ?? 0,
      img: ep.image ?? ep.img,
      title: ep.title,
      description: ep.description ?? ep.overview ?? ep.summary,
    }));
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error fetchEpisodeMeta:", error.message);
    } else {
      console.error("Unknown error fetchEpisodeMeta:", error);
    }
    return [];
  }
}

async function fetchAndCacheData(
  id: string,
  meta: string | null,
  redis: Redis | undefined,
  cacheTime: number,
  refresh: boolean
): Promise<Provider[]> {
  const malsync = await MalSync(id);
  const promises: Promise<Provider[]>[] = [];

  let animeInfo: { title: string; year?: number; type?: string } | null = null;
  
  try {
    const anilistQuery = `
      query ($id: Int) {
        Media(id: $id) {
          title {
            romaji
            english
            native
          }
          startDate {
            year
          }
          format
        }
      }
    `;
    
    const { data } = await axios.post('https://graphql.anilist.co', {
      query: anilistQuery,
      variables: { id: parseInt(id) },
    });
    
    if (data?.data?.Media) {
      const media = data.data.Media;
      animeInfo = {
        title: media.title.english || media.title.romaji,
        year: media.startDate?.year,
        type: media.format, // TV, MOVIE, OVA, etc.
      };
      console.log(`📺 AniList info: "${animeInfo.title}" (${animeInfo.year}, ${animeInfo.type})`);
    }
  } catch (error) {
    console.error('Error fetching AniList info:', error);
  }

  if (malsync) {
    const gogop = malsync.find((i) => i.providerId === 'gogoanime');
    const zorop = malsync.find((i) => i.providerId === 'zoro');
    promises.push(gogop ? fetchGogoanime(gogop.sub || '', gogop.dub || '') : Promise.resolve([]));
    promises.push(zorop ? fetchZoro(zorop.sub || '') : Promise.resolve([]));
    promises.push(zorop ? fetch9anime(zorop.sub || '') : Promise.resolve([]));
  } else {
    console.warn(`MalSync returned null for ID ${id}. Falling back to default providers.`);
    promises.push(fetchConsumet(id));
    promises.push(fetchAnify(id));
    // Fallback for ID 11061
    const fallbackZoroId: { [key: string]: string } = {
      '11061': 'hunter-x-hunter-2',
    };
    if (fallbackZoroId[id]) {
      promises.push(fetchZoro(fallbackZoroId[id]));
    }
  }

  if (animeInfo?.title) {
    promises.push(
      fetchAnimePahe(id, animeInfo.title, animeInfo.year, animeInfo.type)
    );
     promises.push(fetchAnineko(animeInfo.title, animeInfo.type));
  }
    
  // Correctly assign results from promises
  const results = await Promise.all(promises);
  const combined = results.flat().filter((provider) => {
    if (Array.isArray(provider.episodes)) {
      return provider.episodes.length > 0;
    }
    // Safely check sub and dub lengths with fallback to 0
    return (
      (provider.episodes?.sub?.length ?? 0) > 0 ||
      (provider.episodes?.dub?.length ?? 0) > 0
    );
  });

  // console.log(`Combined providers for ID ${id}:`, JSON.stringify(combined, null, 2));

  const cover = await fetchEpisodeMeta(id, !refresh);

  if (redis && combined.length > 0) {
    await redis.setex(`episode:${id}`, cacheTime, JSON.stringify(combined));
  }

  if (cover.length > 0) {
    if (redis) {
      await redis.setex(`meta:${id}`, cacheTime, JSON.stringify(cover));
    }
    return CombineEpisodeMeta(combined, cover);
  } else if (meta) {
    try {
      return CombineEpisodeMeta(combined, JSON.parse(meta));
    } catch (err) {
      console.error('Error parsing meta:', err);
      return combined;
    }
  }

  return combined;
}

interface Params {
  params: Promise<{ animeid: string[] }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { animeid } = await params; // Await params
  const id = animeid[0];
  const url = new URL(req.url);
  const releasing = url.searchParams.get('releasing') === 'true';
  const refresh = url.searchParams.get('refresh') === 'true';
  const cacheTime = releasing ? 60 * 60 * 3 : 60 * 60 * 24 * 45;

  let meta: string | null = null;
  let cached: string | null = null;

  if (redis) {
    try {
      meta = await redis.get(`meta:${id}`);
      if (meta && JSON.parse(meta).length === 0) {
        await redis.del(`meta:${id}`);
        meta = null;
      }

      cached = await redis.get(`episode:${id}`);
      if (cached && JSON.parse(cached).length === 0) {
        await redis.del(`episode:${id}`);
        cached = null;
      }
    } catch (err) {
      console.error('Error checking Redis cache:', err);
    }
  }

  if (refresh || !cached) {
    const data = await fetchAndCacheData(id, meta, redis, cacheTime, refresh);
    return NextResponse.json(data);
  }

  let parsed: Provider[];
  try {
    parsed = JSON.parse(cached);
  } catch (err) {
    console.error('Error parsing cached data:', err);
    parsed = [];
  }

  if (meta) {
    try {
      parsed = await CombineEpisodeMeta(parsed, JSON.parse(meta));
    } catch (err) {
      console.error('Error parsing meta:', err);
    }
  }

  return NextResponse.json(parsed);
}
