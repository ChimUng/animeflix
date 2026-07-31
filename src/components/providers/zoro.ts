import axios from 'axios';
import { Episode, Provider } from '@/types/episode';
import { RawEpisode } from '@/types/providers/legacy.raw';

export async function fetchZoroEpisodes(id: string): Promise<Provider[]> {
  if (!id) return [];
  try {
    const { data } = await axios.get(`${process.env.ZORO_URI}/anime/${id}/episodes`);
    if (!data?.data?.episodes || !Array.isArray(data.data.episodes)) {
      console.warn(`⚠️ [Zoro] No valid episodes for ID ${id}`);
      return [];
    }
    const episodes: Episode[] = data.data.episodes.map((ep: RawEpisode) => ({
      ...ep,
      number: ep.number ?? 0,
    }));
    return [{ providerId: 'zoro', id: 'zoro', episodes }];
  } catch (error) {
    console.error(`Error fetching Zoro for ID ${id}:`, error instanceof Error ? error.message : error);
    return [];
  }
}