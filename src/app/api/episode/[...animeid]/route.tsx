import axios from 'axios';
import { redis } from '@/lib/rediscache';
import { Redis } from 'ioredis';
import { NextRequest, NextResponse } from 'next/server';
import { CombineEpisodeMeta } from '@/utils/EpisodeFunctions';
import { Provider } from '@/types/episode';
import { getEpisodeProviderMapping } from '@/lib/malsync';
import { fetchAniZipEpisodeMeta } from '@/lib/anizip';
import { fetchGogoanimeEpisodes } from '@/components/providers/gogoanime';
import { fetchZoroEpisodes } from '@/components/providers/zoro';
import { fetch9animeEpisodes } from '@/components/providers/ninanime';
import { fetchAnimePaheEpisodes } from '@/components/providers/animepahe';
import { fetchAninekoEpisodes } from '@/components/providers/anineko';
import { fetchAnimeHayEpisodes } from '@/components/providers/animehay';

axios.interceptors.request.use((config) => {
  config.timeout = config.timeout ?? 9000;
  return config;
});

interface AnimeInfo {
  title: string;
  titleRomaji?: string;
  year?: number;
  type?: string;
}

async function fetchAnilistInfo(id: string): Promise<AnimeInfo | null> {
  try {
    const query = `
      query ($id: Int) {
        Media(id: $id) {
          title { romaji english native }
          startDate { year }
          format
        }
      }
    `;
    const { data } = await axios.post('https://graphql.anilist.co', {
      query,
      variables: { id: parseInt(id) },
    });

    const media = data?.data?.Media;
    if (!media) return null;

    return {
      title: media.title.english || media.title.romaji,
      titleRomaji: media.title.romaji,
      year: media.startDate?.year,
      type: media.format,
    };
  } catch (error) {
    console.error('Error fetching AniList info:', error);
    return null;
  }
}

async function fetchAndCacheData(
  id: string,
  meta: string | null,
  redisClient: Redis | undefined,
  cacheTime: number
): Promise<Provider[]> {
  const mapping = await getEpisodeProviderMapping(id);
  const animeInfo = await fetchAnilistInfo(id);

  const promises: Promise<Provider[]>[] = [];

  if (mapping) {
    const gogo = mapping.find((m) => m.providerId === 'gogoanime');
    const zoro = mapping.find((m) => m.providerId === 'zoro');
    promises.push(gogo ? fetchGogoanimeEpisodes(gogo.sub || '', gogo.dub || '') : Promise.resolve([]));
    promises.push(zoro ? fetchZoroEpisodes(zoro.sub || '') : Promise.resolve([]));
    promises.push(zoro ? fetch9animeEpisodes(zoro.sub || '') : Promise.resolve([]));
  } else {
    console.warn(`[MalSync] No mapping for ID ${id}, providers cần mapping (gogoanime/zoro/9anime) sẽ bị bỏ qua.`);
    // Fallback đặc biệt cho vài anime hay bị lệch mapping (giữ lại từ code cũ)
    const fallbackZoroId: Record<string, string> = { '11061': 'hunter-x-hunter-2' };
    if (fallbackZoroId[id]) promises.push(fetchZoroEpisodes(fallbackZoroId[id]));
  }

  // Anineko/AnimeHay/AnimePahe không có mapper sẵn trong MalSync -> luôn tự search theo title,
  // truyền thêm titleRomaji để các provider có thể thử nhiều biến thể title khi search
  // (xem buildTitleCandidates trong lib/matching.ts) — fix case "Hunter x Hunter (2011)".
  if (animeInfo?.title) {
    promises.push(
      fetchAnimePaheEpisodes(id, animeInfo.title, animeInfo.year, animeInfo.type, animeInfo.titleRomaji)
    );
    promises.push(fetchAninekoEpisodes(animeInfo.title, animeInfo.type, animeInfo.titleRomaji));
    promises.push(fetchAnimeHayEpisodes(id, animeInfo.title, animeInfo.type, animeInfo.titleRomaji));
  }

  const results = await Promise.all(promises);
  const combined = results.flat().filter((provider) => {
    if (Array.isArray(provider.episodes)) return provider.episodes.length > 0;
    return (provider.episodes?.sub?.length ?? 0) > 0 || (provider.episodes?.dub?.length ?? 0) > 0;
  });

  const metaData = await fetchAniZipEpisodeMeta(id);

  let merged: Provider[];
  if (metaData.length > 0) {
    merged = await CombineEpisodeMeta(combined, metaData);
    if (redisClient) await redisClient.setex(`meta:${id}`, cacheTime, JSON.stringify(metaData));
  } else if (meta) {
    try {
      merged = await CombineEpisodeMeta(combined, JSON.parse(meta));
    } catch (err) {
      console.error('Error parsing cached meta:', err);
      merged = combined;
    }
  } else {
    merged = combined;
  }

  // Cache CHÍNH bản đã merge (img/title/description/rating đã enrich xong) -> lần đọc cache
  // sau (nhánh cache-hit trong GET) chỉ cần trả thẳng, không phải merge lại.
  if (redisClient && merged.length > 0) {
    await redisClient.setex(`episode:${id}`, cacheTime, JSON.stringify(merged));
  }

  return merged;
}

interface Params {
  params: Promise<{ animeid: string[] }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { animeid } = await params;
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
    const data = await fetchAndCacheData(id, meta, redis, cacheTime);
    return NextResponse.json(data);
  }

  try {
    const parsed: Provider[] = JSON.parse(cached);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Error parsing cached data:', err);
    const data = await fetchAndCacheData(id, meta, redis, cacheTime);
    return NextResponse.json(data);
  }
}