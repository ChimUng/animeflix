// app/api/episode/[...animeid]/route.ts
import axios from 'axios';
import { redis } from '@/lib/rediscache';
import { Redis } from 'ioredis';
import { NextRequest, NextResponse } from 'next/server';
import { CombineEpisodeMeta, Episode, Provider, ImageDataItem } from '@/utils/EpisodeFunctions';
import AnimePahe from '@/components/providers/animepahe';

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
      return data.map((ep: any) => ({
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
  } catch (error: any) {
    console.error('Error fetching consumet:', error.message);
    return [];
  }
}

async function fetchAnify(id: string): Promise<Provider[]> {
  try {
    const { data } = await axios.get(`https://api.anify.tv/info/${id}?fields=[episodes]`);
    if (!data?.episodes?.data) return [];

    const filtered = data.episodes.data.filter((ep: any) => ep.providerId !== '9anime');
    return filtered.map((i: any) => ({
      providerId: i.providerId === 'gogoanime' ? 'gogobackup' : i.providerId,
      id: i.providerId,
      episodes: Array.isArray(i.episodes)
        ? i.episodes.map((ep: any) => ({
            ...ep,
            number: ep.number ?? 0,
          }))
        : {
            sub: i.episodes.sub?.map((ep: any) => ({ ...ep, number: ep.number ?? 0 })) || [],
            dub: i.episodes.dub?.map((ep: any) => ({ ...ep, number: ep.number ?? 0 })) || [],
          },
    }));
  } catch (error: any) {
    console.error('Error fetching anify:', error.message);
    return [];
  }
}

async function fetchAniZipMalId(anilistId: string): Promise<string | null> {
  try {
    const { data } = await axios.get(`https://api.ani.zip/mappings?anilist_id=${anilistId}`);
    // console.log(`AniZip mappings for Anilist ID ${anilistId}:`, JSON.stringify(data, null, 2));
    return data?.mappings?.mal_id?.toString() || null;
  } catch (error: any) {
    console.error(`Error fetching AniZip mappings for Anilist ID ${anilistId}:`, error.message);
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
  } catch (error: any) {
    console.error(`Error fetching MalSync for ID ${id}:`, error.message);
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
      const { data } = await axios.get(`${process.env.CONSUMET_URI}/anime/gogoanime/info/${id}`);
      return (
        data?.episodes?.map((ep: any) => ({
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
  } catch (error: any) {
    console.error('Error fetching gogoanime:', error.message);
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
        episodes: data.data.episodes.map((ep: any) => ({
          ...ep,
          number: ep.number ?? 0,
        })),
      },
    ];
  } catch (error: any) {
    console.error(`Error fetching Zoro for ID ${id}:`, error.message);
    return [];
  }
}

// ⬇️ THÊM HÀM MỚI ĐỂ FETCH TỪ ANIMEPAHE ⬇️
async function fetchAnimePahe(malId: number): Promise<Provider[]> { // Sửa: Trả về một MẢNG Provider
    try {
        const pahe = new AnimePahe(malId);
        const page1 = await pahe.getEpisodes(1);
        const page2 = await pahe.getEpisodes(2);
        const page3 = await pahe.getEpisodes(3);
        const allEpisodes = [...page1, ...page2, ...page3];

        if (allEpisodes.length > 0) {
            // Sửa: Bọc đối tượng kết quả trong một mảng
            return [{
                providerId: 'animepahe',
                id: 'animepahe',
                episodes: allEpisodes,
            }];
        }
        // Sửa: Trả về một mảng rỗng thay vì null
        return [];
    } catch (error) {
        console.error('Lỗi khi fetch từ AnimePahe:', error);
        // Sửa: Trả về một mảng rỗng thay vì null
        return [];
    }
}

async function fetchEpisodeMeta(id: string, skip = false): Promise<ImageDataItem[]> {
  try {
    if (skip) return [];
    const { data } = await axios.get(`https://api.ani.zip/mappings?anilist_id=${id}`);
    // console.log(`AniZip response for ID ${id}:`, JSON.stringify(data, null, 2));
    const episodes = Object.values(data?.data?.episodes || {}) as any[];
    return episodes.map((ep) => ({
      number: ep.number ?? ep.episode ?? 0,
      img: ep.image ?? ep.img,
      title: ep.title,
      description: ep.description ?? ep.overview ?? ep.summary,
    }));
  } catch (error: any) {
    console.error(`Error fetching AniZip meta for ID ${id}:`, error.message);
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

  if (malsync) {
    const gogop = malsync.find((i) => i.providerId === 'gogoanime');
    const zorop = malsync.find((i) => i.providerId === 'zoro');
    promises.push(gogop ? fetchGogoanime(gogop.sub || '', gogop.dub || '') : Promise.resolve([]));
    promises.push(zorop ? fetchZoro(zorop.sub || '') : Promise.resolve([]));
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

   // ⬇️ THÊM PAHE VÀO PROMISES BẤT KỂ KẾT QUẢ MALSINC ⬇️
    // promises.push(fetchAnimePahe(Number(id)));
    
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
