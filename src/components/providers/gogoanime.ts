import axios from 'axios';
import { Episode, Provider } from '@/types/episode';
import { RawEpisode } from '@/types/providers/legacy.raw';

export async function fetchGogoanimeEpisodes(sub: string, dub: string): Promise<Provider[]> {
  try {
    const fetchData = async (id: string): Promise<Episode[]> => {
      const { data } = await axios.get<{ episodes: RawEpisode[] }>(
        `${process.env.CONSUMET_URI}/anime/gogoanime/info/${id}`
      );
      return (data?.episodes || []).map((ep) => ({ ...ep, number: ep.number ?? 0 }));
    };

    const [subData, dubData] = await Promise.all([
      sub ? fetchData(sub) : Promise.resolve([]),
      dub ? fetchData(dub) : Promise.resolve([]),
    ]);

    const episodes: Partial<Record<'sub' | 'dub', Episode[]>> = {};
    if (subData.length > 0) episodes.sub = subData;
    if (dubData.length > 0) episodes.dub = dubData;

    return episodes.sub || episodes.dub
      ? [{ consumet: true, providerId: 'gogoanime', id: 'gogoanime', episodes }]
      : [];
  } catch (error) {
    console.error(`Error fetching Gogoanime:`, error instanceof Error ? error.message : error);
    return [];
  }
}